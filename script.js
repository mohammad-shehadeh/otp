// script.js
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة المتغيرات العامة
    let devices = [];
    const token = assembleGitHubToken();
    const apiUrl = `https://api.github.com/repos/${CONFIG.REPO.OWNER}/${CONFIG.REPO.NAME}/contents/${CONFIG.FILE_PATH}`;
    
    // عناصر DOM
    const newDeviceBtn = document.getElementById('newDeviceBtn');
    const deviceModal = document.getElementById('deviceModal');
    const closeModal = document.querySelector('.close');
    const deviceForm = document.getElementById('deviceForm');
    const devicesList = document.getElementById('devicesList');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // عدادات الإحصائيات
    const totalDevicesEl = document.getElementById('totalDevices');
    const registeredDevicesEl = document.getElementById('registeredDevices');
    const reachedDevicesEl = document.getElementById('reachedDevices');
    const deliveredDevicesEl = document.getElementById('deliveredDevices');
    
    // الأحداث
    newDeviceBtn.addEventListener('click', openModal);
    closeModal.addEventListener('click', closeModalHandler);
    window.addEventListener('click', outsideModalClick);
    deviceForm.addEventListener('submit', handleFormSubmit);
    
    // تهيئة التطبيق
    initializeApp();
    
    // وظائف التطبيق
    
    // تهيئة التطبيق بتحميل البيانات
    async function initializeApp() {
        showLoading();
        try {
            await loadDevices();
            renderDevices();
            updateStats();
        } catch (error) {
            console.error('Error initializing app:', error);
            showNotification('حدث خطأ أثناء تحميل البيانات', 'error');
        } finally {
            hideLoading();
        }
    }
    
    // تحميل الأجهزة من مستودع GitHub
    async function loadDevices() {
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const content = atob(data.content);
            devices = parseDevicesFromContent(content);
        } catch (error) {
            console.error('Error loading devices:', error);
            throw error;
        }
    }
    
    // تحليل محتوى الملف إلى مصفوفة أجهزة
    function parseDevicesFromContent(content) {
        const lines = content.split('\n');
        const devices = [];
        
        let currentDevice = null;
        let inDeviceBlock = false;
        
        for (const line of lines) {
            if (line.startsWith('### [')) {
                if (currentDevice) {
                    devices.push(currentDevice);
                }
                
                // استخراج رقم التذكرة من العنوان
                const ticketMatch = line.match(/### \[(\d+)\]/);
                if (ticketMatch) {
                    currentDevice = {
                        id: parseInt(ticketMatch[1]),
                        status: 'registered' // حالة افتراضية
                    };
                    inDeviceBlock = true;
                }
            } else if (inDeviceBlock && currentDevice) {
                if (line.startsWith('- **اسم العميل**:')) {
                    currentDevice.clientName = line.replace('- **اسم العميل**:', '').trim();
                } else if (line.startsWith('- **نوع الهاتف**:')) {
                    currentDevice.phoneType = line.replace('- **نوع الهاتف**:', '').trim();
                } else if (line.startsWith('- **وصف العطل**:')) {
                    currentDevice.issueDescription = line.replace('- **وصف العطل**:', '').trim();
                } else if (line.startsWith('- **رقم IMEI**:')) {
                    currentDevice.imeiNumber = line.replace('- **رقم IMEI**:', '').trim();
                } else if (line.startsWith('- **رقم الهاتف**:')) {
                    currentDevice.phoneNumber = line.replace('- **رقم الهاتف**:', '').trim();
                } else if (line.startsWith('- **الشركة المصنعة**:')) {
                    currentDevice.manufacturer = line.replace('- **الشركة المصنعة**:', '').trim();
                } else if (line.startsWith('- **الحالة**:')) {
                    const statusText = line.replace('- **الحالة**:', '').trim();
                    if (statusText.includes('تم الاستلام')) {
                        currentDevice.status = 'delivered';
                    } else if (statusText.includes('تم الوصول')) {
                        currentDevice.status = 'reached';
                    } else if (statusText.includes('قيد الصيانة')) {
                        currentDevice.status = 'maintenance';
                    } else {
                        currentDevice.status = 'registered';
                    }
                } else if (line.trim() === '---') {
                    // نهاية كتلة الجهاز
                    inDeviceBlock = false;
                }
            }
        }
        
        // إضافة آخر جهاز
        if (currentDevice) {
            devices.push(currentDevice);
        }
        
        return devices;
    }
    
    // حفظ الأجهزة إلى مستودع GitHub
    async function saveDevices() {
        showLoading();
        try {
            // الحصول على محتوى الملف الحالي
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const sha = data.sha;
            
            // إنشاء محتوى جديد
            const content = generateFileContent();
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            
            // تحديث الملف على GitHub
            const updateResponse = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `تحديث قائمة الأجهزة ${new Date().toLocaleDateString('ar-SA')}`,
                    content: encodedContent,
                    sha: sha
                })
            });
            
            if (!updateResponse.ok) {
                throw new Error(`HTTP error! status: ${updateResponse.status}`);
            }
            
            showNotification('تم حفظ البيانات بنجاح', 'success');
            return true;
        } catch (error) {
            console.error('Error saving devices:', error);
            showNotification('حدث خطأ أثناء حفظ البيانات', 'error');
            return false;
        } finally {
            hideLoading();
        }
    }
    
    // توليد محتوى الملف بناءً على مصفوفة الأجهزة
    function generateFileContent() {
        let content = '# نظام إدارة صيانة الهواتف\n\n';
        content += '## الأجهزة المسجلة\n\n';
        
        devices.forEach(device => {
            content += `### [${device.id}] ${device.clientName}\n`;
            content += `- **اسم العميل**: ${device.clientName}\n`;
            content += `- **نوع الهاتف**: ${device.phoneType}\n`;
            content += `- **وصف العطل**: ${device.issueDescription}\n`;
            content += `- **رقم IMEI**: ${device.imeiNumber}\n`;
            content += `- **رقم الهاتف**: ${device.phoneNumber}\n`;
            content += `- **الشركة المصنعة**: ${device.manufacturer}\n`;
            
            // إضافة الحالة بناءً على قيمة status
            let statusText = '';
            switch(device.status) {
                case 'delivered':
                    statusText = 'تم الاستلام';
                    break;
                case 'reached':
                    statusText = 'تم الوصول';
                    break;
                case 'maintenance':
                    statusText = 'قيد الصيانة';
                    break;
                default:
                    statusText = 'مسجل';
            }
            content += `- **الحالة**: ${statusText}\n`;
            
            content += '---\n\n';
        });
        
        return content;
    }
    
    // عرض الأجهزة في القائمة
    function renderDevices() {
        devicesList.innerHTML = '';
        
        if (devices.length === 0) {
            devicesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mobile-alt"></i>
                    <h3>لا توجد أجهزة مسجلة</h3>
                    <p>انقر على زر "تسجيل جهاز جديد" لإضافة أول جهاز</p>
                </div>
            `;
            return;
        }
        
        devices.forEach(device => {
            const deviceCard = document.createElement('div');
            deviceCard.className = `device-card status-${device.status}`;
            
            // تحديد نص ولون الحالة
            let statusText = '';
            let statusClass = '';
            
            switch(device.status) {
                case 'registered':
                    statusText = 'مسجل';
                    statusClass = 'status-registered';
                    break;
                case 'maintenance':
                    statusText = 'قيد الصيانة';
                    statusClass = 'status-maintenance';
                    break;
                case 'reached':
                    statusText = 'تم الوصول';
                    statusClass = 'status-reached';
                    break;
                case 'delivered':
                    statusText = 'تم الاستلام';
                    statusClass = 'status-delivered';
                    break;
            }
            
            deviceCard.innerHTML = `
                <div class="device-header">
                    <h3>#${device.id} - ${device.clientName}</h3>
                    <span class="device-status ${statusClass}">${statusText}</span>
                </div>
                <div class="device-details">
                    <p><strong>نوع الهاتف:</strong> ${device.phoneType}</p>
                    <p><strong>الشركة المصنعة:</strong> ${device.manufacturer}</p>
                    <p><strong>وصف العطل:</strong> ${device.issueDescription}</p>
                    <p><strong>رقم IMEI:</strong> ${device.imeiNumber}</p>
                    <p><strong>رقم الهاتف:</strong> ${device.phoneNumber}</p>
                </div>
                <div class="device-actions">
                    <button class="btn-action btn-edit" data-id="${device.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn-action btn-delete" data-id="${device.id}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                    <div class="status-actions">
                        <select class="status-select" data-id="${device.id}">
                            <option value="registered" ${device.status === 'registered' ? 'selected' : ''}>مسجل</option>
                            <option value="maintenance" ${device.status === 'maintenance' ? 'selected' : ''}>قيد الصيانة</option>
                            <option value="reached" ${device.status === 'reached' ? 'selected' : ''}>تم الوصول</option>
                            <option value="delivered" ${device.status === 'delivered' ? 'selected' : ''}>تم الاستلام</option>
                        </select>
                    </div>
                </div>
            `;
            
            devicesList.appendChild(deviceCard);
        });
        
        // إضافة مستمعي الأحداث للأزرار
        addEventListenersToButtons();
    }
    
    // إضافة مستمعي الأحداث لأزرار التعديل والحذف وتغيير الحالة
    function addEventListenersToButtons() {
        // أزرار التعديل
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const deviceId = parseInt(this.getAttribute('data-id'));
                editDevice(deviceId);
            });
        });
        
        // أزرار الحذف
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const deviceId = parseInt(this.getAttribute('data-id'));
                deleteDevice(deviceId);
            });
        });
        
        // تغيير الحالة
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', function() {
                const deviceId = parseInt(this.getAttribute('data-id'));
                const newStatus = this.value;
                updateDeviceStatus(deviceId, newStatus);
            });
        });
    }
    
    // تحديث إحصائيات الصفحة
    function updateStats() {
        const total = devices.length;
        const registered = devices.filter(d => d.status === 'registered').length;
        const reached = devices.filter(d => d.status === 'reached').length;
        const delivered = devices.filter(d => d.status === 'delivered').length;
        const maintenance = devices.filter(d => d.status === 'maintenance').length;
        
        totalDevicesEl.textContent = total;
        registeredDevicesEl.textContent = maintenance; // قيد الصيانة
        reachedDevicesEl.textContent = reached;
        deliveredDevicesEl.textContent = delivered;
    }
    
    // فتح نموذج إضافة جهاز جديد
    function openModal() {
        deviceModal.style.display = 'block';
        document.getElementById('deviceForm').reset();
    }
    
    // إغلاق النموذج
    function closeModalHandler() {
        deviceModal.style.display = 'none';
    }
    
    // إغلاق النموذع بالنقر خارج المحتوى
    function outsideModalClick(e) {
        if (e.target === deviceModal) {
            deviceModal.style.display = 'none';
        }
    }
    
    // معالجة تقديم النموذج
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const newDevice = {
            id: generateNewId(),
            clientName: document.getElementById('clientName').value,
            phoneType: document.getElementById('phoneType').value,
            issueDescription: document.getElementById('issueDescription').value,
            imeiNumber: document.getElementById('imeiNumber').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            manufacturer: document.getElementById('manufacturer').value,
            status: 'registered'
        };
        
        devices.push(newDevice);
        
        const saved = await saveDevices();
        if (saved) {
            renderDevices();
            updateStats();
            closeModalHandler();
        }
    }
    
    // توليد معرف جديد للجهاز
    function generateNewId() {
        if (devices.length === 0) return 1;
        return Math.max(...devices.map(d => d.id)) + 1;
    }
    
    // تعديل جهاز موجود
    function editDevice(deviceId) {
        const device = devices.find(d => d.id === deviceId);
        if (!device) return;
        
        // ملء النموذج ببيانات الجهاز
        document.getElementById('clientName').value = device.clientName;
        document.getElementById('phoneType').value = device.phoneType;
        document.getElementById('issueDescription').value = device.issueDescription;
        document.getElementById('imeiNumber').value = device.imeiNumber;
        document.getElementById('phoneNumber').value = device.phoneNumber;
        document.getElementById('manufacturer').value = device.manufacturer;
        
        // فتح النموذج للتعديل
        openModal();
        
        // تغيير سلوك النموذج ليصبح للتعديل بدلاً من الإضافة
        const form = document.getElementById('deviceForm');
        form.onsubmit = async function(e) {
            e.preventDefault();
            
            // تحديث بيانات الجهاز
            device.clientName = document.getElementById('clientName').value;
            device.phoneType = document.getElementById('phoneType').value;
            device.issueDescription = document.getElementById('issueDescription').value;
            device.imeiNumber = document.getElementById('imeiNumber').value;
            device.phoneNumber = document.getElementById('phoneNumber').value;
            device.manufacturer = document.getElementById('manufacturer').value;
            
            const saved = await saveDevices();
            if (saved) {
                renderDevices();
                updateStats();
                closeModalHandler();
                
                // إعادة تعيين سلوك النموذج إلى الإضافة
                form.onsubmit = handleFormSubmit;
            }
        };
    }
    
    // حذف جهاز
    async function deleteDevice(deviceId) {
        if (!confirm('هل أنت متأكد من أنك تريد حذف هذا الجهاز؟')) return;
        
        devices = devices.filter(d => d.id !== deviceId);
        const saved = await saveDevices();
        if (saved) {
            renderDevices();
            updateStats();
        }
    }
    
    // تحديث حالة الجهاز
    async function updateDeviceStatus(deviceId, newStatus) {
        const device = devices.find(d => d.id === deviceId);
        if (!device) return;
        
        device.status = newStatus;
        const saved = await saveDevices();
        if (saved) {
            renderDevices();
            updateStats();
        }
    }
    
    // عرض رسالة إشعار
    function showNotification(message, type = 'info') {
        // إنصراف عنصر الإشعار إذا كان موجوداً
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <p>${message}</p>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        // إظهار الإشعار
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // إخفاء الإشعار تلقائياً بعد 5 ثوان
        setTimeout(() => {
            hideNotification(notification);
        }, 5000);
        
        // إغلاق الإشعار يدوياً
        notification.querySelector('.notification-close').addEventListener('click', () => {
            hideNotification(notification);
        });
    }
    
    // إخفاء رسالة الإشعار
    function hideNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    // عرض شاشة التحميل
    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }
    
    // إخفاء شاشة التحميل
    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }
});

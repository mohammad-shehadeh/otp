// بيانات التطبيق
const app = {
    _devices: [],
    get devices() {
        return this._devices;
    },
    set devices(value) {
        this._devices = Array.isArray(value) ? value : [];
    },
    repoOwner: CONFIG.REPO.OWNER,
    repoName: CONFIG.REPO.NAME,
    filePath: CONFIG.FILE_PATH,
    token: null
};

// عناصر DOM
const elements = {
    newDeviceBtn: document.getElementById('newDeviceBtn'),
    deviceModal: document.getElementById('deviceModal'),
    closeModal: document.querySelector('.close'),
    deviceForm: document.getElementById('deviceForm'),
    devicesList: document.getElementById('devicesList'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    statsElements: {
        total: document.getElementById('totalDevices'),
        registered: document.getElementById('registeredDevices'),
        reached: document.getElementById('reachedDevices'),
        delivered: document.getElementById('deliveredDevices')
    }
};

// تهيئة الأحداث
function initEvents() {
    elements.newDeviceBtn.addEventListener('click', () => {
        // التحقق من وجود token قبل فتح النموذج
        if (!app.token) {
            showTokenModal();
        } else {
            elements.deviceModal.style.display = 'block';
        }
    });

    elements.closeModal.addEventListener('click', () => {
        elements.deviceModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === elements.deviceModal) {
            elements.deviceModal.style.display = 'none';
        }
        if (e.target === document.getElementById('tokenModal')) {
            document.getElementById('tokenModal').style.display = 'none';
        }
    });

    elements.deviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addNewDevice();
    });
}

// وظائف التطبيق
async function loadData() {
    // التحقق من وجود token
    if (!app.token) {
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) {
            app.token = savedToken;
        } else {
            showTokenModal();
            return;
        }
    }
    
    showLoading();
    try {
        const response = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.filePath}`, {
            headers: {
                'Authorization': `Bearer ${app.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.status === 404) {
            app.devices = [];
            renderDevices();
            return;
        }

        if (!response.ok) {
            if (response.status === 401) {
                // Token غير صالح
                showNotification('Token غير صالح، يرجى إدخال token جديد', 'error');
                localStorage.removeItem('github_token');
                app.token = null;
                showTokenModal();
                return;
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `فشل في جلب البيانات (${response.status})`);
        }

        const data = await response.json();
        
        // معالجة محتوى Base64
        let decodedData;
        try {
            decodedData = atob(data.content.replace(/\s/g, ''));
        } catch (e) {
            console.error('خطأ في فك تشفير Base64:', e);
            decodedData = '';
        }
        
        // تحويل المحتوى إلى نص
        let content;
        try {
            content = decodeURIComponent(escape(decodedData));
        } catch (e) {
            console.error('خطأ في تحويل المحتوى:', e);
            content = decodedData;
        }

        try {
            app.devices = content.trim() ? JSON.parse(content) : [];
        } catch (e) {
            console.error('خطأ في تحليل JSON:', e, 'المحتوى:', content);
            app.devices = [];
            
            // محاولة استرجاع البيانات من نسخة احتياطية إذا كان الملف تالفًا
            try {
                const backupContent = localStorage.getItem('devices_backup');
                if (backupContent) {
                    app.devices = JSON.parse(backupContent);
                    console.log('تم استعادة البيانات من النسخة الاحتياطية المحلية');
                }
            } catch (backupError) {
                console.error('فشل استعادة النسخة الاحتياطية:', backupError);
            }
        }

        renderDevices();
        updateStats();
        
        // حفظ نسخة احتياطية محليًا
        try {
            localStorage.setItem('devices_backup', JSON.stringify(app.devices));
        } catch (e) {
            console.warn('تعذر حفظ النسخة الاحتياطية محليًا:', e);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('حدث خطأ أثناء جلب البيانات: ' + error.message, 'error');
        
        // محاولة استخدام البيانات المحلية إذا فشل الاتصال
        try {
            const localData = localStorage.getItem('devices_backup');
            if (localData) {
                app.devices = JSON.parse(localData);
                renderDevices();
                updateStats();
                showNotification('يتم استخدام البيانات المحلية المخزنة مؤقتًا', 'warning');
            }
        } catch (localError) {
            console.error('فشل تحميل البيانات المحلية:', localError);
        }
    } finally {
        hideLoading();
    }
}

async function addNewDevice() {
    // التحقق من صحة البيانات قبل الإرسال
    if (!validateForm()) {
        return;
    }
    
    showLoading();
    try {
        const newDevice = {
            id: generateId(),
            clientName: document.getElementById('clientName').value.trim(),
            phoneType: document.getElementById('phoneType').value.trim(),
            issueDescription: document.getElementById('issueDescription').value.trim(),
            imeiNumber: document.getElementById('imeiNumber').value.trim(),
            phoneNumber: document.getElementById('phoneNumber').value.trim(),
            manufacturer: document.getElementById('manufacturer').value,
            registrationDate: new Date().toISOString(),
            status: 'registered'
        };

        app.devices = [...app.devices, newDevice];
        await saveDataToGitHub();

        elements.deviceForm.reset();
        elements.deviceModal.style.display = 'none';
        renderDevices();
        updateStats();
        
        showNotification('تم إضافة الجهاز بنجاح', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('حدث خطأ أثناء إضافة الجهاز: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function saveDataToGitHub() {
    try {
        let sha = '';
        try {
            const getResponse = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.filePath}`, {
                headers: {
                    'Authorization': `Bearer ${app.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (getResponse.ok) {
                const data = await getResponse.json();
                sha = data.sha;
            }
        } catch (e) {
            console.log('الملف غير موجود، سيتم إنشاؤه جديداً');
        }

        const content = JSON.stringify(app.devices, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(content)));
        
        const response = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${app.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'تحديث بيانات الأجهزة',
                content: encodedContent,
                sha: sha || undefined
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `فشل في حفظ البيانات (${response.status})`);
        }
        
        // حفظ نسخة احتياطية محليًا بعد النجاح
        localStorage.setItem('devices_backup', JSON.stringify(app.devices));
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function renderDevices() {
    elements.devicesList.innerHTML = '';

    if (app.devices.length === 0) {
        elements.devicesList.innerHTML = '<p class="no-devices">لا توجد أجهزة مسجلة بعد</p>';
        return;
    }

    // ترتيب الأجهزة حسب التاريخ من الأحدث إلى الأقدم
    app.devices.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))
        .forEach(device => {
            const days = Math.floor((new Date() - new Date(device.registrationDate)) / (1000 * 60 * 60 * 24));

            // تحديد كلاس الحالة حسب حالة الجهاز
            let statusClass = '';
            let statusIcon = '';
            let statusText = '';
            
            switch(device.status) {
                case 'registered':
                    statusClass = 'status-registered';
                    statusIcon = '📝';
                    statusText = 'تم التسجيل';
                    break;
                case 'reached':
                    statusClass = 'status-reached';
                    statusIcon = '🛠️';
                    statusText = 'تم الوصول';
                    break;
                case 'delivered':
                    statusClass = 'status-delivered';
                    statusIcon = '✅';
                    statusText = 'تم الاستلام';
                    break;
                default:
                    statusClass = 'status-default';
                    statusIcon = '❓';
                    statusText = 'غير معروف';
            }

            const deviceCard = document.createElement('div');
            deviceCard.className = `device-card ${statusClass}`;
            deviceCard.innerHTML = `
                <div class="device-header">
                    <div class="device-title">
                        <span class="status-icon">${statusIcon}</span>
                        ${escapeHtml(device.clientName)} - ${escapeHtml(device.phoneType)}
                    </div>
                    <div class="device-days" title="عدد الأيام منذ التسجيل">${days} يوم</div>
                </div>
                <div class="device-details">
                    <div class="detail-item"><label>نوع الهاتف:</label><span>${escapeHtml(device.phoneType)}</span></div>
                    <div class="detail-item"><label>رقم الهاتف:</label><span>${escapeHtml(device.phoneNumber)}</span></div>
                    <div class="detail-item"><label>الشركة المصنعة:</label><span>${escapeHtml(device.manufacturer)}</span></div>
                    <div class="detail-item"><label>IMEI:</label><span>${escapeHtml(device.imeiNumber)}</span></div>
                    <div class="detail-item"><label>تاريخ التسجيل:</label><span>${formatDate(device.registrationDate)}</span></div>
                    <div class="detail-item full-width"><label>وصف العطل:</label><span>${escapeHtml(device.issueDescription)}</span></div>
                </div>
                <div class="device-actions">
                    <select class="status-select" data-id="${device.id}">
                        <option value="registered" ${device.status === 'registered' ? 'selected' : ''}>تم التسجيل</option>
                        <option value="reached" ${device.status === 'reached' ? 'selected' : ''}>تم الوصول</option>
                        <option value="delivered" ${device.status === 'delivered' ? 'selected' : ''}>تم الاستلام</option>
                    </select>
                    <button class="btn-delete" data-id="${device.id}" title="حذف الجهاز">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            elements.devicesList.appendChild(deviceCard);
        });

    // إضافة أحداث لعناصر الواجهة
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            updateDeviceStatus(e.target.dataset.id, e.target.value);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deviceId = e.currentTarget.dataset.id;
            deleteDevice(deviceId);
        });
    });
}

async function updateDeviceStatus(deviceId, newStatus) {
    showLoading();
    try {
        app.devices = app.devices.map(device =>
            device.id === deviceId ? { ...device, status: newStatus } : device
        );
        await saveDataToGitHub();
        updateStats();
        showNotification('تم تحديث حالة الجهاز بنجاح', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('حدث خطأ أثناء تحديث حالة الجهاز', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteDevice(deviceId) {
    if (!confirm('هل أنت متأكد من أنك تريد حذف هذا الجهاز؟')) {
        return;
    }
    
    showLoading();
    try {
        app.devices = app.devices.filter(device => device.id !== deviceId);
        await saveDataToGitHub();
        renderDevices();
        updateStats();
        showNotification('تم حذف الجهاز بنجاح', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('حدث خطأ أثناء حذف الجهاز', 'error');
    } finally {
        hideLoading();
    }
}

function updateStats() {
    elements.statsElements.total.textContent = app.devices.length;
    elements.statsElements.registered.textContent = app.devices.filter(d => d.status === 'registered').length;
    elements.statsElements.reached.textContent = app.devices.filter(d => d.status === 'reached').length;
    elements.statsElements.delivered.textContent = app.devices.filter(d => d.status === 'delivered').length;
}

// وظائف مساعدة
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
}

function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateForm() {
    const clientName = document.getElementById('clientName').value.trim();
    const phoneType = document.getElementById('phoneType').value.trim();
    const issueDescription = document.getElementById('issueDescription').value.trim();
    const imeiNumber = document.getElementById('imeiNumber').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    
    if (!clientName) {
        showNotification('يرجى إدخال اسم العميل', 'error');
        return false;
    }
    
    if (!phoneType) {
        showNotification('يرجى إدخال نوع الهاتف', 'error');
        return false;
    }
    
    if (!issueDescription) {
        showNotification('يرجى إدخال وصف العطل', 'error');
        return false;
    }
    
    if (!imeiNumber) {
        showNotification('يرجى إدخال رقم IMEI', 'error');
        return false;
    }
    
    if (!phoneNumber) {
        showNotification('يرجى إدخال رقم الهاتف', 'error');
        return false;
    }
    
    return true;
}

function showNotification(message, type = 'info') {
    // إنشاء عنصر الإشعار إذا لم يكن موجودًا
    let notification = document.getElementById('app-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'app-notification';
        document.body.appendChild(notification);
    }
    
    // إضافة كلاس حسب النوع
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.display = 'block';
    
    // إخفاء الإشعار تلقائيًا بعد 5 ثوان
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// وظائف إدارة Token
function showTokenModal() {
    // إنشاء نموذج إدخال Token إذا لم يكن موجودًا
    let tokenModal = document.getElementById('tokenModal');
    if (!tokenModal) {
        tokenModal = document.createElement('div');
        tokenModal.id = 'tokenModal';
        tokenModal.className = 'modal';
        tokenModal.innerHTML = `
            <div class="modal-content glass-modal">
                <span class="close" id="closeTokenModal">&times;</span>
                <h2><i class="fas fa-key"></i> إدخال GitHub Token</h2>
                <p>يجب إدخال GitHub Token للوصول إلى البيانات.</p>
                <div class="form-group">
                    <label for="githubToken">GitHub Token:</label>
                    <input type="password" id="githubToken" class="modern-input" placeholder="أدخل token الخاص بك">
                </div>
                <div class="token-help">
                    <p>كيفية الحصول على Token:</p>
                    <ol>
                        <li>اذهب إلى GitHub → Settings → Developer settings → Personal access tokens</li>
                        <li>انقر على "Generate new token"</li>
                        <li>أعطِه اسمًا واختر صلاحية <strong>repo</strong> (للمستودعات الخاصة) أو <strong>public_repo</strong> (للمستودعات العامة)</li>
                        <li>انسخ Token وأدخله هنا</li>
                    </ol>
                </div>
                <button id="saveTokenBtn" class="btn-primary glow-on-hover">
                    <i class="fas fa-save"></i> حفظ Token
                </button>
            </div>
        `;
        document.body.appendChild(tokenModal);
        
        // إضافة أحداث للنموذج
        document.getElementById('closeTokenModal').addEventListener('click', () => {
            tokenModal.style.display = 'none';
        });
        
        document.getElementById('saveTokenBtn').addEventListener('click', saveToken);
    }
    
    tokenModal.style.display = 'block';
}

function saveToken() {
    const tokenInput = document.getElementById('githubToken');
    const token = tokenInput.value.trim();
    
    if (!token) {
        showNotification('يرجى إدخال Token', 'error');
        return;
    }
    
    // اختبار صحة Token
    testGitHubToken(token).then(isValid => {
        if (isValid) {
            app.token = token;
            localStorage.setItem('github_token', token);
            document.getElementById('tokenModal').style.display = 'none';
            showNotification('تم حفظ Token بنجاح', 'success');
            loadData();
        } else {
            showNotification('Token غير صالح، يرجى التأكد من صحته', 'error');
        }
    });
}

async function testGitHubToken(token) {
    try {
        const response = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error testing token:', error);
        return false;
    }
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    
    // محاولة تحميل Token المحفوظ
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
        app.token = savedToken;
        loadData();
    } else {
        showTokenModal();
    }
    
    // إضافة أنماط الإشعار إذا لم تكن موجودة
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            #app-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 20px;
                border-radius: 4px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                display: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .notification-success { background-color: #4CAF50; }
            .notification-error { background-color: #F44336; }
            .notification-warning { background-color: #FF9800; }
            .notification-info { background-color: #2196F3; }
            
            .token-help {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                font-size: 14px;
            }
            
            .token-help ol {
                padding-right: 20px;
            }
            
            .token-help li {
                margin-bottom: 8px;
            }
        `;
        document.head.appendChild(style);
    }
});

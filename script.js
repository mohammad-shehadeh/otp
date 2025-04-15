// بيانات التطبيق// بيانات التطبيق
const app = {
    devices: [],
    repoOwner: CONFIG.REPO_OWNER,
    repoName: CONFIG.REPO_NAME,
    filePath: CONFIG.FILE_PATH,
    get token() {
        return getGitHubToken();
    }
};

// ... بقية الكود يبقى كما هو بدون تغيير ...

// عناصر DOM
const elements = {
    newDeviceBtn: document.getElementById('newDeviceBtn'),
    deviceModal: document.getElementById('deviceModal'),
    closeModal: document.querySelector('.close'),
    deviceForm: document.getElementById('deviceForm'),
    devicesList: document.getElementById('devicesList'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    totalDevices: document.getElementById('totalDevices'),
    registeredDevices: document.getElementById('registeredDevices'),
    reachedDevices: document.getElementById('reachedDevices'),
    deliveredDevices: document.getElementById('deliveredDevices')
};

// أحداث
elements.newDeviceBtn.addEventListener('click', () => {
    elements.deviceModal.style.display = 'block';
});

elements.closeModal.addEventListener('click', () => {
    elements.deviceModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === elements.deviceModal) {
        elements.deviceModal.style.display = 'none';
    }
});

elements.deviceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addNewDevice();
});

// وظائف التطبيق

// تحميل البيانات الأولية
async function loadData() {
    showLoading();
    try {
        const response = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.filePath}`, {
            headers: {
                'Authorization': `token ${app.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.status === 404) {
            // الملف غير موجود، سنقوم بإنشائه لاحقاً عند إضافة أول جهاز
            renderDevices();
            hideLoading();
            return;
        }
        
        if (!response.ok) {
            throw new Error('فشل في جلب البيانات');
        }
        
        const data = await response.json();
        const content = atob(data.content);
        
        if (content.trim()) {
            app.devices = JSON.parse(content);
        }
        
        renderDevices();
        updateStats();
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء جلب البيانات: ' + error.message);
    } finally {
        hideLoading();
    }
}

// عرض الأجهزة
function renderDevices() {
    elements.devicesList.innerHTML = '';
    
    if (app.devices.length === 0) {
        elements.devicesList.innerHTML = '<p class="no-devices">لا توجد أجهزة مسجلة بعد</p>';
        return;
    }
    
    // فرز الأجهزة حسب التاريخ (الأحدث أولاً)
    const sortedDevices = [...app.devices].sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
    
    sortedDevices.forEach(device => {
        const deviceCard = document.createElement('div');
        deviceCard.className = 'device-card';
        
        // حساب عدد الأيام
        const registrationDate = new Date(device.registrationDate);
        const today = new Date();
        const diffTime = today - registrationDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        deviceCard.innerHTML = `
            <div class="device-header">
                <div class="device-title">${device.clientName} - ${device.phoneType}</div>
                <div class="devce-days">${diffDays} يوم</div>
            </div>
            
            <div class="device-details">
                <div class="detail-item">
                    <label>نوع الهاتف</label>
                    <span>${device.phoneType}</span>
                </div>
                
                <div class="detail-item">
                    <label>الشركة المصنعة</label>
                    <span>${device.manufacturer}</span>
                </div>
                
                <div class="detail-item">
                    <label>لون الهاتف</label>
                    <span>${device.phoneColor}</span>
                </div>
                
                <div class="detail-item">
                    <label>رقم IMEI</label>
                    <span>${device.imeiNumber}</span>
                </div>
                
                <div class="detail-item">
                    <label>تاريخ التسجيل</label>
                    <span>${formatDate(device.registrationDate)}</span>
                </div>
            </div>
            
            <div class="detail-item full-width">
                <label>وصف العطل</label>
                <span>${device.issueDescription}</span>
            </div>
            
            <div class="device-status">
                <select class="status-select" data-id="${device.id}">
                    <option value="registered" ${device.status === 'registered' ? 'selected' : ''}>تم التسجيل</option>
                    <option value="reached" ${device.status === 'reached' ? 'selected' : ''}>تم الوصول</option>
                    <option value="delivered" ${device.status === 'delivered' ? 'selected' : ''}>تم الاستلام</option>
                </select>
            </div>
        `;
        
        elements.devicesList.appendChild(deviceCard);
    });
    
    // إضافة مستمعي الأحداث لحقول التحديث
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const deviceId = e.target.dataset.id;
            const newStatus = e.target.value;
            updateDeviceStatus(deviceId, newStatus);
        });
    });
}

// تحديث حالة الجهاز
async function updateDeviceStatus(deviceId, newStatus) {
    showLoading();
    try {
        const deviceIndex = app.devices.findIndex(d => d.id === deviceId);
        if (deviceIndex !== -1) {
            app.devices[deviceIndex].status = newStatus;
            await saveDataToGitHub();
            updateStats();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء تحديث حالة الجهاز');
    } finally {
        hideLoading();
    }
}

// إضافة جهاز جديد
async function addNewDevice() {
    showLoading();
    try {
        const newDevice = {
            id: generateId(),
            clientName: document.getElementById('clientName').value,
            phoneType: document.getElementById('phoneType').value,
            issueDescription: document.getElementById('issueDescription').value,
            imeiNumber: document.getElementById('imeiNumber').value,
            phoneColor: document.getElementById('phoneColor').value,
            manufacturer: document.getElementById('manufacturer').value,
            registrationDate: new Date().toISOString(),
            status: 'registered'
        };
        
        app.devices.push(newDevice);
        await saveDataToGitHub();
        
        // إعادة تعيين النموذج وإخفائه
        elements.deviceForm.reset();
        elements.deviceModal.style.display = 'none';
        
        renderDevices();
        updateStats();
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء إضافة الجهاز: ' + error.message);
    } finally {
        hideLoading();
    }
}

// حفظ البيانات إلى GitHub
async function saveDataToGitHub() {
    try {
        // جلب SHA الملف الحالي إذا كان موجوداً
        let sha = '';
        try {
            const getResponse = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.filePath}`, {
                headers: {
                    'Authorization': `token ${app.token}`,
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
                'Authorization': `token ${app.token}`,
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
            throw new Error('فشل في حفظ البيانات');
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// تحديث الإحصائيات
function updateStats() {
    elements.totalDevices.textContent = app.devices.length;
    elements.registeredDevices.textContent = app.devices.filter(d => d.status === 'registered').length;
    elements.reachedDevices.textContent = app.devices.filter(d => d.status === 'reached').length;
    elements.deliveredDevices.textContent = app.devices.filter(d => d.status === 'delivered').length;
}

// وظائف مساعدة
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});
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
    get token() {
        return assembleGitHubToken();
    }
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
            app.devices = [];
            renderDevices();
            return;
        }
        
        if (!response.ok) throw new Error('فشل في جلب البيانات');
        
        const data = await response.json();
        const decodedData = atob(data.content);
const content = decodeURIComponent(escape(decodedData));
        
        try {
            app.devices = content.trim() ? JSON.parse(content) : [];
        } catch (e) {
            app.devices = [];
            console.error('Error parsing data:', e);
        }
        
        renderDevices();
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء جلب البيانات: ' + error.message);
        app.devices = [];
    } finally {
        hideLoading();
        updateStats();
    }
}

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
        
        app.devices = [...app.devices, newDevice];
        await saveDataToGitHub();
        
        elements.deviceForm.reset();
        elements.deviceModal.style.display = 'none';
        renderDevices();
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء إضافة الجهاز: ' + error.message);
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
        const response = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${app.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'تحديث بيانات الأجهزة',
                content: btoa(unescape(encodeURIComponent(content))),
                sha: sha || undefined
            })
        });
        
        if (!response.ok) throw new Error('فشل في حفظ البيانات');
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
    
    app.devices.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))
        .forEach(device => {
            const days = Math.floor((new Date() - new Date(device.registrationDate)) / (1000 * 60 * 60 * 24));
            
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-card';
            deviceCard.innerHTML = `
                <div class="device-header">
                    <div class="device-title">${device.clientName} - ${device.phoneType}</div>
                    <div class="device-days">${days} يوم</div>
                </div>
                <div class="device-details">
                    <div class="detail-item"><label>نوع الهاتف</label><span>${device.phoneType}</span></div>
                    <div class="detail-item"><label>الشركة المصنعة</label><span>${device.manufacturer}</span></div>
                    <div class="detail-item"><label>لون الهاتف</label><span>${device.phoneColor}</span></div>
                    <div class="detail-item"><label>رقم IMEI</label><span>${device.imeiNumber}</span></div>
                    <div class="detail-item"><label>تاريخ التسجيل</label><span>${formatDate(device.registrationDate)}</span></div>
                    <div class="detail-item full-width"><label>وصف العطل</label><span>${device.issueDescription}</span></div>
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
    
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            updateDeviceStatus(e.target.dataset.id, e.target.value);
        });
    });
}

async function updateDeviceStatus(deviceId, newStatus) {
    showLoading();
    try {
        app.devices = app.devices.map(device => 
            device.id === deviceId ? {...device, status: newStatus} : device
        );
        await saveDataToGitHub();
        updateStats();
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء تحديث حالة الجهاز');
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

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    app.devices = []; // تهيئة مؤكدة
    loadData();
});
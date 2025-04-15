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

// تهيئة الأحداث
function initEvents() {
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
}

// وظائف التطبيق الأساسية
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
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const content = atob(data.content);
        
        try {
            app.devices = content.trim() ? JSON.parse(content) : [];
        } catch (e) {
            console.error('Error parsing data:', e);
            app.devices = [];
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
        const form = elements.deviceForm;
        const newDevice = {
            id: generateId(),
            clientName: form.clientName.value,
            phoneType: form.phoneType.value,
            issueDescription: form.issueDescription.value,
            imeiNumber: form.imeiNumber.value,
            phoneColor: form.phoneColor.value,
            manufacturer: form.manufacturer.value,
            registrationDate: new Date().toISOString(),
            status: 'registered'
        };
        
        app.devices = [...app.devices, newDevice];
        await saveDataToGitHub();
        
        form.reset();
        elements.deviceModal.style.display = 'none';
        renderDevices();
        printDeviceReceipt(newDevice);
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
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في حفظ البيانات');
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function renderDevices() {
    elements.devicesList.innerHTML = '';
    
    if (app.devices.length === 0) {
        elements.devicesList.innerHTML = `
            <div class="no-devices">
                <i class="fas fa-mobile-alt"></i>
                <p>لا توجد أجهزة مسجلة بعد</p>
            </div>
        `;
        return;
    }
    
    app.devices.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))
        .forEach(device => {
            const days = Math.floor((new Date() - new Date(device.registrationDate)) / (1000 * 60 * 60 * 24));
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-card';
            deviceCard.innerHTML = `
                <div class="device-header">
                    <div class="device-title">${escapeHtml(device.clientName)} - ${escapeHtml(device.phoneType)}</div>
                    <div class="device-days">${days} يوم</div>
                    <button class="print-btn" data-device='${JSON.stringify(device).replace(/'/g, "\\'")}'>
                        <i class="fas fa-print"></i>
                    </button>
                </div>
                <div class="device-details">
                    <div class="detail-item">
                        <label>نوع الهاتف</label>
                        <span>${escapeHtml(device.phoneType)}</span>
                    </div>
                    <div class="detail-item">
                        <label>الشركة المصنعة</label>
                        <span>${escapeHtml(device.manufacturer)}</span>
                    </div>
                    <div class="detail-item">
                        <label>لون الهاتف</label>
                        <span>${escapeHtml(device.phoneColor)}</span>
                    </div>
                    <div class="detail-item">
                        <label>رقم IMEI</label>
                        <span>${escapeHtml(device.imeiNumber)}</span>
                    </div>
                    <div class="detail-item">
                        <label>تاريخ التسجيل</label>
                        <span>${formatDate(device.registrationDate)}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>وصف العطل</label>
                        <span>${escapeHtml(device.issueDescription)}</span>
                    </div>
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
    
    // أحداث أزرار الطباعة
    document.querySelectorAll('.print-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deviceData = JSON.parse(e.currentTarget.getAttribute('data-device'));
            printDeviceReceipt(deviceData);
        });
    });
    
    // أحداث تغيير الحالة
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const deviceId = e.target.dataset.id;
            const newStatus = e.target.value;
            showLoading();
            try {
                await updateDeviceStatus(deviceId, newStatus);
            } catch (error) {
                console.error('Error:', error);
                alert('حدث خطأ أثناء تحديث الحالة');
            } finally {
                hideLoading();
            }
        });
    });
}

async function updateDeviceStatus(deviceId, newStatus) {
    try {
        app.devices = app.devices.map(device => 
            device.id === deviceId ? {...device, status: newStatus} : device
        );
        await saveDataToGitHub();
        updateStats();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function updateStats() {
    elements.statsElements.total.textContent = app.devices.length;
    elements.statsElements.registered.textContent = app.devices.filter(d => d.status === 'registered').length;
    elements.statsElements.reached.textContent = app.devices.filter(d => d.status === 'reached').length;
    elements.statsElements.delivered.textContent = app.devices.filter(d => d.status === 'delivered').length;
}

// وظائف الطباعة
function printDeviceReceipt(device) {
    try {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>إيصال استلام</title>
                <style>
                    @page { size: 80mm 200mm; margin: 0; }
                    body { 
                        font-family: Arial, sans-serif;
                        width: 80mm;
                        margin: 0;
                        padding: 5mm;
                        font-size: 14px;
                    }
                    .header { text-align: center; margin-bottom: 5mm; }
                    .logo { max-width: 50mm; max-height: 20mm; }
                    .title { font-weight: bold; font-size: 16px; margin: 2mm 0; }
                    .divider { 
                        border-top: 1px dashed #000;
                        margin: 3mm 0;
                    }
                    .row { 
                        display: flex;
                        justify-content: space-between;
                        margin: 2mm 0;
                    }
                    .label { font-weight: bold; }
                    .footer { 
                        text-align: center;
                        margin-top: 5mm;
                        font-size: 12px;
                    }
                    .barcode {
                        text-align: center;
                        margin: 3mm 0;
                        font-family: 'Libre Barcode 128', cursive;
                        font-size: 24px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    ${CONFIG.PRINT_LOGO ? `<img src="${CONFIG.PRINT_LOGO}" class="logo" alt="Logo">` : ''}
                    <div class="title">${CONFIG.SHOP_INFO.name}</div>
                    <div>${CONFIG.SHOP_INFO.address}</div>
                    <div class="divider"></div>
                    <div class="title">إيصال استلام جهاز</div>
                </div>
                
                <div class="row">
                    <span class="label">رقم الإيصال:</span>
                    <span>${device.id}</span>
                </div>
                
                <div class="row">
                    <span class="label">التاريخ:</span>
                    <span>${formatDate(device.registrationDate, true)}</span>
                </div>
                
                <div class="divider"></div>
                
                <div class="row">
                    <span class="label">اسم العميل:</span>
                    <span>${escapeHtml(device.clientName)}</span>
                </div>
                
                <div class="row">
                    <span class="label">نوع الجهاز:</span>
                    <span>${escapeHtml(device.phoneType)}</span>
                </div>
                
                <div class="row">
                    <span class="label">الشركة المصنعة:</span>
                    <span>${escapeHtml(device.manufacturer)}</span>
                </div>
                
                <div class="row">
                    <span class="label">لون الجهاز:</span>
                    <span>${escapeHtml(device.phoneColor)}</span>
                </div>
                
                <div class="row">
                    <span class="label">رقم IMEI:</span>
                    <span>${escapeHtml(device.imeiNumber)}</span>
                </div>
                
                <div class="divider"></div>
                
                <div>
                    <div class="label">وصف العطل:</div>
                    <div>${escapeHtml(device.issueDescription)}</div>
                </div>
                
                <div class="divider"></div>
                
                <div class="barcode">
                    *${device.id}*
                </div>
                
                <div class="footer">
                    <div>هاتف: ${CONFIG.SHOP_INFO.phone}</div>
                    <div>يتم الاستلام خلال 3 أيام عمل</div>
                    <div>شكراً لثقتكم بنا</div>
                </div>
                
                <script>
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 200);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    } catch (error) {
        console.error('Error in printing:', error);
        alert('حدث خطأ أثناء الطباعة: ' + error.message);
    }
}

// وظائف مساعدة
function escapeHtml(unsafe) {
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function generateId() {
    return 'D' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3).toUpperCase();
}

function formatDate(dateString, forPrint = false) {
    const date = new Date(dateString);
    if (forPrint) {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('ar-EG', options);
    } else {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('ar-EG', options);
    }
}

function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    app.devices = [];
    loadData();
});
// بيانات التطبيق
const app = {
    _devices: [],
    get devices() {
        return this._devices;
    },
    set devices(value) {
        this._devices = Array.isArray(value) ? value : [];
    },
    _serverData: {},
    get serverData() {
        return this._serverData;
    },
    set serverData(value) {
        this._serverData = value || {};
    },
    repoOwner: CONFIG.REPO.OWNER,
    repoName: CONFIG.REPO.NAME,
    devicesFilePath: CONFIG.FILE_PATH,
    serverFilePath: 'Server.md',
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
    },
    serverInfoSection: document.getElementById('serverInfo'),
    serverForm: document.getElementById('serverForm')
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

elements.serverForm.addEventListener('submit', (e) => {
    e.preventDefault();
    updateServerInfo();
});

// وظائف التطبيق

async function loadData() {
    showLoading();
    try {
        // تحميل بيانات الأجهزة
        const devicesResponse = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.devicesFilePath}`, {
            headers: {
                'Authorization': `token ${app.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (devicesResponse.ok) {
            const devicesData = await devicesResponse.json();
            const decodedDevicesData = atob(devicesData.content);
            const devicesContent = decodeURIComponent(escape(decodedDevicesData));
            app.devices = devicesContent.trim() ? JSON.parse(devicesContent) : [];
        } else if (devicesResponse.status !== 404) {
            throw new Error('فشل في جلب بيانات الأجهزة');
        }

        // تحميل بيانات السيرفر من Server.md
        const serverResponse = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.serverFilePath}`, {
            headers: {
                'Authorization': `token ${app.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (serverResponse.ok) {
            const serverData = await serverResponse.json();
            const decodedServerData = atob(serverData.content);
            const serverContent = decodeURIComponent(escape(decodedServerData));
            app.serverData = parseServerMarkdown(serverContent);
            renderServerInfo();
        } else if (serverResponse.status !== 404) {
            throw new Error('فشل في جلب بيانات السيرفر');
        }

        renderDevices();
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء جلب البيانات: ' + error.message);
        app.devices = [];
        app.serverData = {};
    } finally {
        hideLoading();
        updateStats();
    }
}

function parseServerMarkdown(content) {
    const data = {};
    const lines = content.split('\n');
    
    lines.forEach(line => {
        if (line.startsWith('###')) {
            const key = line.replace('###', '').trim();
            data[key] = '';
        } else if (line.includes(':')) {
            const [key, value] = line.split(':').map(item => item.trim());
            if (key && value) {
                data[key] = value;
            }
        }
    });
    
    return data;
}

function generateServerMarkdown(data) {
    let content = '';
    
    // إضافة العنوان الرئيسي
    content += `# معلومات السيرفر\n\n`;
    
    // إضافة الأقسام والبيانات
    for (const [key, value] of Object.entries(data)) {
        if (value === '') {
            content += `### ${key}\n`;
        } else {
            content += `${key}: ${value}\n`;
        }
    }
    
    return content;
}

function renderServerInfo() {
    if (!app.serverData || Object.keys(app.serverData).length === 0) {
        elements.serverInfoSection.innerHTML = '<p>لا توجد بيانات للسيرفر</p>';
        return;
    }
    
    let html = '<div class="server-info-card"><h3>معلومات السيرفر</h3><div class="server-details">';
    
    for (const [key, value] of Object.entries(app.serverData)) {
        if (value === '') {
            html += `</div><h4>${key}</h4><div class="server-details">`;
        } else {
            html += `<div class="server-detail-item">
                        <label>${key}:</label>
                        <input type="text" name="${key}" value="${value}" placeholder="أدخل ${key}">
                    </div>`;
        }
    }
    
    html += '</div></div>';
    elements.serverInfoSection.innerHTML = html;
}

async function updateServerInfo() {
    showLoading();
    try {
        const formData = new FormData(elements.serverForm);
        const updatedData = {};
        
        formData.forEach((value, key) => {
            updatedData[key] = value;
        });
        
        app.serverData = updatedData;
        
        // جلب SHA للملف الموجود إذا كان موجوداً
        let sha = '';
        try {
            const getResponse = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.serverFilePath}`, {
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
            console.log('ملف السيرفر غير موجود، سيتم إنشاؤه جديداً');
        }
        
        const content = generateServerMarkdown(app.serverData);
        const response = await fetch(`https://api.github.com/repos/${app.repoOwner}/${app.repoName}/contents/${app.serverFilePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${app.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'تحديث بيانات السيرفر',
                content: btoa(unescape(encodeURIComponent(content))),
                sha: sha || undefined
            })
        });
        
        if (!response.ok) throw new Error('فشل في حفظ بيانات السيرفر');
        
        renderServerInfo();
        alert('تم تحديث بيانات السيرفر بنجاح');
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء تحديث بيانات السيرفر: ' + error.message);
    } finally {
        hideLoading();
    }
}

// باقي الوظائف تبقى كما هي (addNewDevice, saveDataToGitHub, renderDevices, updateDeviceStatus, updateStats, ...)

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    app.devices = [];
    app.serverData = {};
    loadData();
});
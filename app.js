// متغيرات التطبيق
let selectedDevice = null;
let items = [];
let isConnected = false;
let characteristic = null;

// عناصر DOM
const scanButton = document.getElementById('scanButton');
const devicesList = document.getElementById('devicesList');
const connectedSection = document.getElementById('connectedSection');
const connectedPrinter = document.getElementById('connectedPrinter');
const disconnectButton = document.getElementById('disconnectButton');
const printButton = document.getElementById('printButton');
const addItemButton = document.getElementById('addItemButton');
const itemsList = document.getElementById('itemsList');
const statusMessage = document.getElementById('statusMessage');
const itemModal = document.getElementById('itemModal');
const closeModal = document.querySelector('.close');
const saveItemButton = document.getElementById('saveItemButton');

// بيانات الفاتورة
const customerName = document.getElementById('customerName');
const invoiceNumber = document.getElementById('invoiceNumber');
const invoiceDate = document.getElementById('invoiceDate');

// بيانات العنصر
const itemName = document.getElementById('itemName');
const itemPrice = document.getElementById('itemPrice');
const itemQuantity = document.getElementById('itemQuantity');

// تعيين تاريخ اليوم كتاريخ افتراضي
window.onload = function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
};

// أحداث التطبيق
scanButton.addEventListener('click', scanDevices);
disconnectButton.addEventListener('click', disconnectDevice);
printButton.addEventListener('click', printInvoice);
addItemButton.addEventListener('click', () => itemModal.style.display = 'block');
closeModal.addEventListener('click', () => itemModal.style.display = 'none');
saveItemButton.addEventListener('click', saveItem);

// إغلاق النافذة المنبثقة عند النقر خارجها
window.addEventListener('click', (event) => {
    if (event.target === itemModal) {
        itemModal.style.display = 'none';
    }
});

// البحث عن أجهزة البلوتوث
async function scanDevices() {
    showStatus('جاري البحث عن الطابعات...', 'info');

    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: ['generic_access']
        });

        selectedDevice = device;
        showDeviceInfo(device);
        connectToDevice(device);
    } catch (error) {
        showStatus(`خطأ: ${error.message}`, 'error');
        console.error('Error:', error);
    }
}

// عرض معلومات الجهاز
function showDeviceInfo(device) {
    devicesList.innerHTML = `
        <div class="device-item">
            <strong>${device.name || 'جهاز غير معروف'}</strong>
            <p>معرف: ${device.id}</p>
        </div>
    `;
}

// الاتصال بالجهاز
async function connectToDevice(device) {
    showStatus('جاري الاتصال بالطابعة...', 'info');

    try {
        const server = await device.gatt.connect();
        showStatus('تم الاتصال بالطابعة بنجاح', 'success');
        
        isConnected = true;
        connectedPrinter.textContent = device.name || 'طابعة غير معروفة';
        connectedSection.style.display = 'block';
        printButton.disabled = false;
        
        // يمكنك هنا البحث عن الخدمات والخصائص المحددة للطابعة
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    } catch (error) {
        showStatus(`خطأ في الاتصال: ${error.message}`, 'error');
        console.error('Connection error:', error);
    }
}

// قطع الاتصال بالجهاز
function disconnectDevice() {
    if (selectedDevice && selectedDevice.gatt.connected) {
        selectedDevice.gatt.disconnect();
        showStatus('تم قطع الاتصال بالطابعة', 'info');
    }
    
    isConnected = false;
    selectedDevice = null;
    connectedSection.style.display = 'none';
    printButton.disabled = true;
    devicesList.innerHTML = '';
}

// حفظ العنصر الجديد
function saveItem() {
    const name = itemName.value.trim();
    const price = parseFloat(itemPrice.value);
    const quantity = parseInt(itemQuantity.value);

    if (!name || isNaN(price) || isNaN(quantity)) {
        showStatus('الرجاء إدخال جميع بيانات العنصر', 'error');
        return;
    }

    const newItem = {
        id: Date.now(),
        name,
        price,
        quantity,
        total: price * quantity
    };

    items.push(newItem);
    renderItems();
    
    itemName.value = '';
    itemPrice.value = '';
    itemQuantity.value = '1';
    itemModal.style.display = 'none';
}

// عرض العناصر
function renderItems() {
    itemsList.innerHTML = '';

    if (items.length === 0) {
        itemsList.innerHTML = '<p>لا توجد عناصر مضافة</p>';
        return;
    }

    let total = 0;
    
    items.forEach(item => {
        total += item.total;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'item';
        itemElement.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <p>${item.quantity} × ${item.price.toFixed(2)} = ${item.total.toFixed(2)}</p>
            </div>
            <div class="item-actions">
                <button onclick="removeItem(${item.id})" class="btn btn-danger" style="padding: 5px 10px;">حذف</button>
            </div>
        `;
        
        itemsList.appendChild(itemElement);
    });

    const totalElement = document.createElement('div');
    totalElement.className = 'item';
    totalElement.style.fontWeight = 'bold';
    totalElement.innerHTML = `
        <div>الإجمالي</div>
        <div>${total.toFixed(2)}</div>
    `;
    itemsList.appendChild(totalElement);
}

// حذف العنصر
function removeItem(id) {
    items = items.filter(item => item.id !== id);
    renderItems();
}

// طباعة الفاتورة
async function printInvoice() {
    if (!isConnected) {
        showStatus('الرجاء الاتصال بطابعة أولاً', 'error');
        return;
    }

    if (items.length === 0) {
        showStatus('الرجاء إضافة عناصر للفاتورة', 'error');
        return;
    }

    const name = customerName.value.trim() || 'عميل غير معروف';
    const number = invoiceNumber.value.trim() || '---';
    const date = invoiceDate.value || new Date().toISOString().split('T')[0];
    
    const total = items.reduce((sum, item) => sum + item.total, 0);

    let receiptText = `
        \x1B\x40\x1B\x21\x08
        \x1B\x61\x01
        ${'فاتورة بيع'.padStart(24)}\n
        \x1B\x21\x00
        \x1B\x61\x00
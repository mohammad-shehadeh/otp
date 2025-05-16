let items = []; // لتخزين الأصناف من ملف test.txt
let currentInvoice = {
    id: 1,
    date: new Date(),
    branch: "الفرع الرئيسي",
    items: [],
    total: 0
};
let savedInvoices = JSON.parse(localStorage.getItem('invoices')) || [];
let currentInvoiceIndex = 0;

// عناصر DOM
const barcodeInput = document.getElementById('barcode');
const addItemBtn = document.getElementById('add-item');
const invoiceItems = document.getElementById('invoice-items');
const totalAmount = document.querySelector('.total-amount');
const invoiceNumber = document.getElementById('invoice-number');
const currentDate = document.getElementById('current-date');
const branchSelect = document.getElementById('branch');
const newInvoiceBtn = document.getElementById('new-invoice');
const saveInvoiceBtn = document.getElementById('save-invoice');
const printInvoiceBtn = document.getElementById('print-invoice');
const loadInvoiceBtn = document.getElementById('load-invoice');
const prevInvoiceBtn = document.getElementById('prev-invoice');
const nextInvoiceBtn = document.getElementById('next-invoice');
const invoicesModal = document.getElementById('invoices-modal');
const closeModal = document.querySelector('.close');
const savedInvoicesTable = document.querySelector('#saved-invoices tbody');
const searchInvoiceInput = document.getElementById('search-invoice');
const searchBtn = document.getElementById('search-btn');

// عناصر الطباعة
const printTemplate = document.getElementById('print-template');
const printBranch = document.getElementById('print-branch');
const printDate = document.getElementById('print-date');
const printInvoiceNum = document.getElementById('print-invoice-num');
const printItemsList = document.getElementById('print-items-list');
const printTotal = document.getElementById('print-total');
const printTime = document.getElementById('print-time');

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تعيين التاريخ الحالي
    updateCurrentDate();
    
    // تحميل الأصناف من ملف test.txt
    loadItemsFromFile();
    
    // التركيز على حقل الباركود تلقائيًا
    barcodeInput.focus();
    
    // تحديث عرض الفاتورة
    updateInvoiceDisplay();
    
    // تعيين معالج الأحداث
    setupEventListeners();
    
    // إنشاء فاتورة جديدة إذا كانت هناك فاتورة حالية فارغة
    if (currentInvoice.items.length === 0) {
        createNewInvoice();
    }
});

// تحميل الأصناف من ملف test.txt
function loadItemsFromFile() {
    fetch('test.txt')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(data => {
            const lines = data.split('\n');
            items = lines.map(line => {
                const parts = line.split('/');
                if (parts.length === 3) {
                    return {
                        name: parts[0].trim(),
                        price: parseFloat(parts[1].trim()),
                        barcode: parts[2].trim().toLowerCase() // تحويل الباركود لحروف صغيرة للتجنب مشكلة الحروف الكبيرة/الصغيرة
                    };
                }
                return null;
            }).filter(item => item !== null);
            
            console.log('تم تحميل الأصناف:', items);
        })
        .catch(error => {
            console.error('حدث خطأ أثناء تحميل الأصناف:', error);
            // بيانات افتراضية في حالة فشل تحميل الملف
            items = [
                { name: "قهوة تركية", price: 15.00, barcode: "123456789" },
                { name: "شاي بالنعناع", price: 10.00, barcode: "987654321" },
                { name: "عصير برتقال", price: 12.50, barcode: "456123789" }
            ].map(item => ({...item, barcode: item.barcode.toLowerCase()}));
        });
}

// تعيين معالج الأحداث
function setupEventListeners() {
    // إضافة صنف عند الضغط على زر الإضافة أو Enter
    addItemBtn.addEventListener('click', addItemByBarcode);
    barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addItemByBarcode();
        }
    });
    
    // تغيير الفرع
    branchSelect.addEventListener('change', function() {
        currentInvoice.branch = this.value;
    });
    
    // فاتورة جديدة
    newInvoiceBtn.addEventListener('click', createNewInvoice);
    
    // حفظ الفاتورة
    saveInvoiceBtn.addEventListener('click', saveInvoice);
    
    // طباعة الفاتورة (مع الحفظ التلقائي)
    printInvoiceBtn.addEventListener('click', function() {
        saveInvoice();
        preparePrintTemplate();
        setTimeout(printInvoice, 100);
    });
    
    // فتح الفواتير المحفوظة
    loadInvoiceBtn.addEventListener('click', openInvoicesModal);
    
    // التنقل بين الفواتير
    prevInvoiceBtn.addEventListener('click', loadPrevInvoice);
    nextInvoiceBtn.addEventListener('click', loadNextInvoice);
    
    // إغلاق النافذة المنبثقة
    closeModal.addEventListener('click', closeInvoicesModal);
    
    // البحث عن الفواتير
    searchBtn.addEventListener('click', searchInvoices);
    searchInvoiceInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchInvoices();
        }
    });
    
    // النقر خارج النافذة المنبثقة يغلقها
    window.addEventListener('click', function(event) {
        if (event.target === invoicesModal) {
            closeInvoicesModal();
        }
    });
    
    // التركيز على حقل الباركود عند أي نقرة على الصفحة
    document.addEventListener('click', function() {
        if (document.activeElement !== barcodeInput) {
            barcodeInput.focus();
        }
    });
}

// تحديث التاريخ الحالي
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDate.textContent = now.toLocaleDateString('ar-SA', options);
    currentInvoice.date = now;
}

// إضافة صنف بواسطة الباركود
function addItemByBarcode() {
    const barcode = barcodeInput.value.trim().toLowerCase(); // تحويل الباركود المدخل لحروف صغيرة
    if (!barcode) return;
    
    const item = items.find(i => i.barcode === barcode);
    if (item) {
        addItemToInvoice(item);
        barcodeInput.value = '';
        barcodeInput.focus();
    } else {
        alert('الصنف غير موجود!');
        barcodeInput.select();
    }
}

// إضافة صنف إلى الفاتورة
function addItemToInvoice(item) {
    // التحقق مما إذا كان الصنف موجودًا بالفعل في الفاتورة
    const existingItem = currentInvoice.items.find(i => i.barcode === item.barcode);
    
    if (existingItem) {
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * existingItem.price;
    } else {
        currentInvoice.items.push({
            ...item,
            quantity: 1,
            total: item.price
        });
    }
    
    // حساب الإجمالي
    calculateTotal();
    
    // تحديث عرض الفاتورة
    updateInvoiceDisplay();
}

// حساب الإجمالي
function calculateTotal() {
    currentInvoice.total = currentInvoice.items.reduce((sum, item) => sum + item.total, 0);
}

// تحديث عرض الفاتورة
function updateInvoiceDisplay() {
    // تفريغ جدول العناصر
    invoiceItems.innerHTML = '';
    
    // إضافة العناصر إلى الجدول
    currentInvoice.items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td>${item.price.toFixed(2)} ₪</td>
            <td>
                <input type="number" min="1" value="${item.quantity}" 
                       data-barcode="${item.barcode}" class="quantity-input">
            </td>
            <td>${item.total.toFixed(2)} ₪</td>
            <td class="delete-item" data-barcode="${item.barcode}"><i class="fas fa-trash"></i></td>
        `;
        invoiceItems.appendChild(row);
    });
    
    // تحديث الإجمالي
    totalAmount.textContent = `${currentInvoice.total.toFixed(2)} ₪`;
    
    // تحديث رقم الفاتورة
    invoiceNumber.textContent = `فاتورة #${currentInvoice.id}`;
    
    // إضافة معالج الأحداث لحقول الكمية
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', updateItemQuantity);
    });
    
    // إضافة معالج الأحداث لأزرار الحذف
    document.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', deleteItem);
    });
}

// تحديث كمية الصنف
function updateItemQuantity(e) {
    const barcode = e.target.getAttribute('data-barcode');
    const newQuantity = parseInt(e.target.value);
    
    if (newQuantity > 0) {
        const item = currentInvoice.items.find(i => i.barcode === barcode);
        if (item) {
            item.quantity = newQuantity;
            item.total = item.quantity * item.price;
            calculateTotal();
            updateInvoiceDisplay();
        }
    } else {
        e.target.value = 1;
    }
}

// حذف صنف من الفاتورة
function deleteItem(e) {
    const barcode = e.currentTarget.getAttribute('data-barcode');
    currentInvoice.items = currentInvoice.items.filter(i => i.barcode !== barcode);
    calculateTotal();
    updateInvoiceDisplay();
    barcodeInput.focus();
}

// إنشاء فاتورة جديدة
function createNewInvoice() {
    if (currentInvoice.items.length > 0 && 
        !confirm('هل تريد إنشاء فاتورة جديدة؟ سيتم فقدان التغييرات غير المحفوظة.')) {
        return;
    }
    
    // إنشاء فاتورة جديدة
    const newId = savedInvoices.length > 0 ? 
                 Math.max(...savedInvoices.map(i => i.id)) + 1 : 1;
    
    currentInvoice = {
        id: newId,
        date: new Date(),
        branch: branchSelect.value,
        items: [],
        total: 0
    };
    
    updateCurrentDate();
    updateInvoiceDisplay();
    barcodeInput.focus();
}

// حفظ الفاتورة
function saveInvoice() {
    if (currentInvoice.items.length === 0) {
        alert('لا يمكن حفظ فاتورة فارغة!');
        return false;
    }
    
    // تحديث تاريخ الفاتورة
    currentInvoice.date = new Date();
    
    // التحقق مما إذا كانت الفاتورة موجودة بالفعل
    const existingIndex = savedInvoices.findIndex(i => i.id === currentInvoice.id);
    
    if (existingIndex !== -1) {
        // تحديث الفاتورة الموجودة
        savedInvoices[existingIndex] = {...currentInvoice};
    } else {
        // إضافة فاتورة جديدة
        savedInvoices.push({...currentInvoice});
    }
    
    // حفظ في localStorage
    localStorage.setItem('invoices', JSON.stringify(savedInvoices));
    
    console.log(`تم حفظ الفاتورة #${currentInvoice.id} بنجاح!`);
    return true;
}

// إعداد قالب الطباعة
function preparePrintTemplate() {
    // إضافة كلاس خاص للطباعة الحرارية
    printTemplate.className = 'thermal-print';
    
    printBranch.textContent = `الفرع: ${currentInvoice.branch}`;
    printDate.textContent = `التاريخ: ${new Date(currentInvoice.date).toLocaleDateString('ar-SA')}`;
    printInvoiceNum.textContent = `#${currentInvoice.id}`;
    printTime.textContent = `الوقت: ${new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}`;
    
    // تفريغ قائمة العناصر المطبوعة
    printItemsList.innerHTML = '';
    
    // إضافة العناصر إلى قائمة الطباعة
    currentInvoice.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'print-item';
        itemDiv.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span class="item-quantity">${item.quantity} x ${item.price.toFixed(2)}</span>
            <span class="item-total">${item.total.toFixed(2)} ₪</span>
        `;
        printItemsList.appendChild(itemDiv);
    });
    
    // تحديث الإجمالي المطبوع
    printTotal.innerHTML = `
        <span>الإجمالي:</span>
        <span>${currentInvoice.total.toFixed(2)} ₪</span>
    `;
}

// طباعة الفاتورة// طباعة الفاتورة كـ PDF
function printInvoice() {
    if (currentInvoice.items.length === 0) {
        alert('لا يمكن طباعة فاتورة فارغة!');
        return;
    }

    // إنشاء مستند PDF جديد بعرض 80mm (حوالي 226 وحدة في jsPDF)
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [226, 1000] // عرض 80mm (226pt) وطول متغير
    });

    // إعداد الخط - نستخدم خطًا عربيًا إذا كان متاحًا
    doc.setFont('Arial'); // يمكن استبداله بخط عربي إذا كان مضافًا

    // معلومات الفاتورة
    const margin = 10;
    let yPos = 20;

    // عنوان الفاتورة
    doc.setFontSize(14);
    doc.text('فاتورة بيع', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += 20;

    // معلومات الفاتورة
    doc.setFontSize(10);
    doc.text(`الفرع: ${currentInvoice.branch}`, margin, yPos, { align: 'right' });
    doc.text(`التاريخ: ${new Date(currentInvoice.date).toLocaleDateString('ar-SA')}`, doc.internal.pageSize.width - margin, yPos, { align: 'left' });
    yPos += 15;

    doc.text(`الوقت: ${new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}`, margin, yPos, { align: 'right' });
    doc.text(`رقم: #${currentInvoice.id}`, doc.internal.pageSize.width - margin, yPos, { align: 'left' });
    yPos += 20;

    // خط فاصل
    doc.line(margin, yPos, doc.internal.pageSize.width - margin, yPos);
    yPos += 15;

    // عناصر الفاتورة
    doc.setFontSize(10);
    currentInvoice.items.forEach(item => {
        // اسم الصنف
        doc.text(item.name, doc.internal.pageSize.width - margin, yPos, { align: 'right' });
        
        // الكمية والسعر
        const quantityText = `${item.quantity} x ${item.price.toFixed(2)}`;
        doc.text(quantityText, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
        
        // الإجمالي
        doc.text(`${item.total.toFixed(2)} ₪`, margin, yPos, { align: 'left' });
        
        yPos += 15;
        
        // خط فاصل خفيف بين العناصر
        doc.line(margin, yPos, doc.internal.pageSize.width - margin, yPos);
        yPos += 10;
    });

    // الإجمالي
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('الإجمالي:', doc.internal.pageSize.width - margin - 100, yPos, { align: 'right' });
    doc.text(`${currentInvoice.total.toFixed(2)} ₪`, doc.internal.pageSize.width - margin, yPos, { align: 'right' });
    yPos += 20;

    // تذييل الصفحة
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('شكراً لزيارتكم', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += 15;
    doc.text('نتمنى لكم يومًا سعيداً', doc.internal.pageSize.width / 2, yPos, { align: 'center' });

    // حفظ الملف باسم فاتورة ورقمها
    doc.save(`فاتورة_${currentInvoice.id}.pdf`);

    // إنشاء فاتورة جديدة بعد الطباعة
    setTimeout(createNewInvoice, 500);
}
// فتح نافذة الفواتير المحفوظة
function openInvoicesModal() {
    displaySavedInvoices();
    invoicesModal.style.display = 'block';
    searchInvoiceInput.focus();
}

// إغلاق نافذة الفواتير المحفوظة
function closeInvoicesModal() {
    invoicesModal.style.display = 'none';
    barcodeInput.focus();
}

// عرض الفواتير المحفوظة
function displaySavedInvoices(filter = '') {
    savedInvoicesTable.innerHTML = '';
    
    const filteredInvoices = filter ? 
        savedInvoices.filter(inv => 
            inv.id.toString().includes(filter) || 
            inv.branch.toLowerCase().includes(filter.toLowerCase()) || // عدم التحسس لحالة الأحرف
            new Date(inv.date).toLocaleDateString('ar-SA').includes(filter)
        ) : savedInvoices;
    
    if (filteredInvoices.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align:center;">لا توجد فواتير</td>`;
        savedInvoicesTable.appendChild(row);
        return;
    }
    
    // ترتيب الفواتير من الأحدث إلى الأقدم
    filteredInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    filteredInvoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.id}</td>
            <td>${new Date(invoice.date).toLocaleDateString('ar-SA')}</td>
            <td>${invoice.branch}</td>
            <td>${invoice.total.toFixed(2)} ₪</td>
            <td>
                <button class="load-btn" data-id="${invoice.id}">فتح</button>
                <button class="print-btn" data-id="${invoice.id}">طباعة</button>
                <button class="delete-btn" data-id="${invoice.id}">حذف</button>
            </td>
        `;
        savedInvoicesTable.appendChild(row);
    });
    
    // إضافة معالج الأحداث لأزرار الفتح
    document.querySelectorAll('.load-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            loadInvoiceById(id);
            closeInvoicesModal();
        });
    });
    
    // إضافة معالج الأحداث لأزرار // في دالة displaySavedInvoices، عدل معالج حدث زر الطباعة ليصبح:
document.querySelectorAll('.print-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        loadInvoiceById(id);
        closeInvoicesModal();
        setTimeout(() => {
            saveInvoice();
            setTimeout(printInvoice, 200); // سيتم الآن إنشاء PDF بدلاً من الطباعة المباشرة
        }, 200);
    });
});
    
    // إضافة معالج الأحداث لأزرار الحذف
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteInvoiceById(id);
        });
    });
}

// تحميل فاتورة بواسطة المعرف
function loadInvoiceById(id) {
    const invoice = savedInvoices.find(i => i.id === id);
    if (invoice) {
        currentInvoice = {...invoice};
        currentInvoice.date = new Date(invoice.date);
        branchSelect.value = invoice.branch;
        updateInvoiceDisplay();
        currentInvoiceIndex = savedInvoices.findIndex(i => i.id === id);
        barcodeInput.focus();
    }
}

// حذف فاتورة بواسطة المعرف
function deleteInvoiceById(id) {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
        savedInvoices = savedInvoices.filter(i => i.id !== id);
        localStorage.setItem('invoices', JSON.stringify(savedInvoices));
        
        if (currentInvoice.id === id) {
            createNewInvoice();
        }
        
        displaySavedInvoices(searchInvoiceInput.value);
    }
}

// البحث عن الفواتير
function searchInvoices() {
    const searchTerm = searchInvoiceInput.value.trim();
    displaySavedInvoices(searchTerm);
}

// تحميل الفاتورة السابقة
function loadPrevInvoice() {
    if (savedInvoices.length === 0) return;
    
    currentInvoiceIndex = (currentInvoiceIndex - 1 + savedInvoices.length) % savedInvoices.length;
    const invoice = savedInvoices[currentInvoiceIndex];
    loadInvoiceById(invoice.id);
}

// تحميل الفاتورة التالية
function loadNextInvoice() {
    if (savedInvoices.length === 0) return;
    
    currentInvoiceIndex = (currentInvoiceIndex + 1) % savedInvoices.length;
    const invoice = savedInvoices[currentInvoiceIndex];
    loadInvoiceById(invoice.id);
}
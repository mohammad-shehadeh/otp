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
                        barcode: parts[2].trim().toLowerCase()
                    };
                }
                return null;
            }).filter(item => item !== null);
            
            console.log('تم تحميل الأصناف:', items);
        })
        .catch(error => {
            console.error('حدث خطأ أثناء تحميل الأصناف:', error);
            items = [
                { name: "قهوة تركية", price: 15.00, barcode: "123456789" },
                { name: "شاي بالنعناع", price: 10.00, barcode: "987654321" },
                { name: "عصير برتقال", price: 12.50, barcode: "456123789" }
            ].map(item => ({...item, barcode: item.barcode.toLowerCase()}));
        });
}

// تعيين معالج الأحداث
function setupEventListeners() {
    addItemBtn.addEventListener('click', addItemByBarcode);
    barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addItemByBarcode();
        }
    });
    
    branchSelect.addEventListener('change', function() {
        currentInvoice.branch = this.value;
    });
    
    newInvoiceBtn.addEventListener('click', createNewInvoice);
    saveInvoiceBtn.addEventListener('click', saveInvoice);
    printInvoiceBtn.addEventListener('click', printInvoice);
    loadInvoiceBtn.addEventListener('click', openInvoicesModal);
    prevInvoiceBtn.addEventListener('click', loadPrevInvoice);
    nextInvoiceBtn.addEventListener('click', loadNextInvoice);
    closeModal.addEventListener('click', closeInvoicesModal);
    searchBtn.addEventListener('click', searchInvoices);
    searchInvoiceInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchInvoices();
        }
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === invoicesModal) {
            closeInvoicesModal();
        }
    });
    
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
    const barcode = barcodeInput.value.trim().toLowerCase();
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
    
    calculateTotal();
    updateInvoiceDisplay();
}

// حساب الإجمالي
function calculateTotal() {
    currentInvoice.total = currentInvoice.items.reduce((sum, item) => sum + item.total, 0);
}

// تحديث عرض الفاتورة
function updateInvoiceDisplay() {
    invoiceItems.innerHTML = '';
    
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
    
    totalAmount.textContent = `${currentInvoice.total.toFixed(2)} ₪`;
    invoiceNumber.textContent = `فاتورة #${currentInvoice.id}`;
    
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', updateItemQuantity);
    });
    
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
    
    currentInvoice.date = new Date();
    
    const existingIndex = savedInvoices.findIndex(i => i.id === currentInvoice.id);
    
    if (existingIndex !== -1) {
        savedInvoices[existingIndex] = {...currentInvoice};
    } else {
        savedInvoices.push({...currentInvoice});
    }
    
    localStorage.setItem('invoices', JSON.stringify(savedInvoices));
    
    console.log(`تم حفظ الفاتورة #${currentInvoice.id} بنجاح!`);
    return true;
}

// طباعة الفاتورة كـ PDF بحجم 80مم
function printInvoice() {
    if (currentInvoice.items.length === 0) {
        alert('لا يمكن طباعة فاتورة فارغة!');
        return;
    }

    // تأكد من حفظ الفاتورة أولاً
    if (!saveInvoice()) return;

    // إنشاء مستند PDF بحجم 80مم
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297] // عرض 80مم، طول متغير
    });

    // إعداد الخط العربي (يجب توفير خط Amiri أو استخدام خط افتراضي يدعم العربية)
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);

    // إعدادات الطباعة
    const margin = 2;
    const pageWidth = 80 - (margin * 2);
    const currentDate = new Date(currentInvoice.date).toLocaleDateString('ar-SA');
    const currentTime = new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'});

    // عنوان الفاتورة
    doc.setFontSize(14);
    doc.text('فاتورة بيع', margin + (pageWidth / 2), 10, { align: 'center' });

    // معلومات الفاتورة
    doc.setFontSize(10);
    doc.text(`الفرع: ${currentInvoice.branch}`, margin, 15);
    doc.text(`التاريخ: ${currentDate}`, margin + pageWidth - doc.getTextWidth(`التاريخ: ${currentDate}`), 15);
    doc.text(`الوقت: ${currentTime}`, margin, 20);
    doc.text(`رقم: #${currentInvoice.id}`, margin + pageWidth - doc.getTextWidth(`رقم: #${currentInvoice.id}`), 20);

    // خط فاصل
    doc.line(margin, 25, margin + pageWidth, 25);

    // جدول العناصر
    let yPos = 30;
    currentInvoice.items.forEach(item => {
        const itemText = `${item.name} (${item.quantity} x ${item.price.toFixed(2)})`;
        const totalText = `${item.total.toFixed(2)} ر.س`;
        
        // إذا كان النص طويلاً، نقسمه إلى سطرين
        if (doc.getTextWidth(itemText) > pageWidth * 0.7) {
            const mid = Math.floor(item.name.length / 2);
            doc.text(item.name.substring(0, mid), margin, yPos);
            doc.text(`${item.name.substring(mid)} (${item.quantity} x ${item.price.toFixed(2)})`, margin, yPos + 5);
            doc.text(totalText, margin + pageWidth - doc.getTextWidth(totalText), yPos + 5);
            yPos += 10;
        } else {
            doc.text(itemText, margin, yPos);
            doc.text(totalText, margin + pageWidth - doc.getTextWidth(totalText), yPos);
            yPos += 7;
        }
    });

    // خط فاصل قبل الإجمالي
    doc.line(margin, yPos, margin + pageWidth, yPos);
    yPos += 5;

    // الإجمالي
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const totalText = `الإجمالي: ${currentInvoice.total.toFixed(2)} ر.س`;
    doc.text(totalText, margin + pageWidth - doc.getTextWidth(totalText), yPos);

    // تذييل الفاتورة
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('شكراً لزيارتكم', margin + (pageWidth / 2), yPos + 10, { align: 'center' });
    doc.text('نتمنى لكم يومًا سعيداً', margin + (pageWidth / 2), yPos + 15, { align: 'center' });

    // حفظ وعرض PDF للطباعة
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(pdfUrl);
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
            // إنشاء فاتورة جديدة بعد الطباعة
            setTimeout(createNewInvoice, 500);
        }, 500);
    };
}

// باقي الدوال (
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
    
    // إضافة معالج الأحداث لأزرار الطباعة
    document.querySelectorAll('.print-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            loadInvoiceById(id);
            closeInvoicesModal();
            setTimeout(() => {
                saveInvoice();
                setTimeout(printInvoice, 200);
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
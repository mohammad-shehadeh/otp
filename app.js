let printerDevice;
let printerCharacteristic;

async function connectPrinter() {
  try {
    printerDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "Printer" }],
      optionalServices: [0xFFE0] // استبدل بمعرف الخدمة الفعلي للطابعة
    });

    const server = await printerDevice.gatt.connect();
    const service = await server.getPrimaryService(0xFFE0); // عدل حسب طابعتك
    printerCharacteristic = await service.getCharacteristic(0xFFE1); // عدل حسب طابعتك

    document.getElementById("status").textContent = "تم الاتصال بالطابعة";
  } catch (error) {
    console.error(error);
    document.getElementById("status").textContent = "فشل الاتصال بالطابعة";
  }
}

function printReceipt() {
  if (!printerCharacteristic) {
    alert("يجب الاتصال بالطابعة أولاً");
    return;
  }

  const receiptText = `
    متجر النجاح
    ------------------------
    منتج 1        10.00₪
    منتج 2        15.00₪
    ------------------------
    المجموع:      25.00₪
    شكراً لزيارتكم
  `;

  const encoder = new TextEncoder("utf-8");
  const data = encoder.encode(receiptText);

  // تقسيم البيانات إذا كانت طويلة
  const chunkSize = 20;
  for (let i = 0; i < data.length; i += chunkSize) {
    printerCharacteristic.writeValue(data.slice(i, i + chunkSize));
  }
}
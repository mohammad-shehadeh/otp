let printerCharacteristic;

async function connectPrinter() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [0xFFE0, 0xFFB0, 0x18F0] // جرب أكثر من خدمة إن لزم
    });

    const server = await device.gatt.connect();
    
    // المحاولة مع أكثر من خدمة
    const services = await server.getPrimaryServices();
    let characteristicFound = false;

    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          printerCharacteristic = char;
          characteristicFound = true;
          break;
        }
      }
      if (characteristicFound) break;
    }

    if (printerCharacteristic) {
      document.getElementById("status").textContent = `تم الاقتران بالجهاز: ${device.name || "غير معروف"}`;
    } else {
      document.getElementById("status").textContent = "تعذر العثور على خاصية للطباعة";
    }

  } catch (error) {
    console.error(error);
    document.getElementById("status").textContent = "فشل الاتصال بالطابعة";
  }
}

function printReceipt() {
  if (!printerCharacteristic) {
    alert("يرجى الاتصال بالطابعة أولاً");
    return;
  }

  const receiptText = `
متجر النجاح
----------------------
منتج 1      10.00₪
منتج 2      15.00₪
----------------------
الإجمالي:   25.00₪
شكراً لزيارتكم!
`;

  const encoder = new TextEncoder("utf-8");
  const data = encoder.encode(receiptText);

  // إرسال البيانات على شكل أجزاء
  const chunkSize = 20;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    printerCharacteristic.writeValue(chunk);
  }
}
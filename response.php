<?php
header('Content-Type: application/json; charset=utf-8');

// عناصر الفاتورة
$invoiceItems = [
    ['name' => 'سماعة بلوتوث', 'qty' => 1, 'price' => 75],
    ['name' => 'كابل USB-C', 'qty' => 2, 'price' => 25],
    ['name' => 'شاحن سريع', 'qty' => 1, 'price' => 60],
];

$total = 0;
$response = [];

// اسم المتجر
$storeTitle = new stdClass();
$storeTitle->type = 0;
$storeTitle->content = 'متجر النجاح للإلكترونيات';
$storeTitle->bold = 1;
$storeTitle->align = 1;
$storeTitle->format = 2;
$response[] = $storeTitle;

// خط فاصل
$divider = new stdClass();
$divider->type = 0;
$divider->content = '-------------------------------';
$divider->bold = 0;
$divider->align = 1;
$divider->format = 0;
$response[] = $divider;

// العناصر
foreach ($invoiceItems as $item) {
    $line = "{$item['name']} x{$item['qty']} = " . ($item['qty'] * $item['price']) . " ₪";
    $total += $item['qty'] * $item['price'];

    $lineObj = new stdClass();
    $lineObj->type = 0;
    $lineObj->content = $line;
    $lineObj->bold = 0;
    $lineObj->align = 0;
    $lineObj->format = 0;
    $response[] = $lineObj;
}

// خط فاصل آخر
$response[] = $divider;

// الإجمالي
$totalObj = new stdClass();
$totalObj->type = 0;
$totalObj->content = "الإجمالي: {$total} ₪";
$totalObj->bold = 1;
$totalObj->align = 2;
$totalObj->format = 1;
$response[] = $totalObj;

// QR كود (مثلاً يحتوي على رابط الفاتورة)
$qr = new stdClass();
$qr->type = 3;
$qr->value = 'https://yourdomain.com/invoice/123';
$qr->size = 40;
$qr->align = 1;
$response[] = $qr;

// سطر فارغ
$space = new stdClass();
$space->type = 0;
$space->content = ' ';
$space->bold = 0;
$space->align = 0;
$space->format = 0;
$response[] = $space;

// إخراج JSON
echo json_encode($response, JSON_UNESCAPED_UNICODE);
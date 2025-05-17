<?php
header('Content-Type: application/json; charset=utf-8');

$response = [];

$line = new stdClass();
$line->type = 0;
$line->content = 'متجر النجاح';
$line->bold = 1;
$line->align = 1;
$line->format = 2;
$response[] = $line;

$divider = new stdClass();
$divider->type = 0;
$divider->content = '----------------------';
$divider->bold = 0;
$divider->align = 1;
$divider->format = 0;
$response[] = $divider;

$total = 100;

$totalLine = new stdClass();
$totalLine->type = 0;
$totalLine->content = "الإجمالي: {$total} ₪";
$totalLine->bold = 1;
$totalLine->align = 2;
$totalLine->format = 1;
$response[] = $totalLine;

echo json_encode($response, JSON_UNESCAPED_UNICODE);
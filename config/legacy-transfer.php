<?php

$assetUrl = (string) env('LEGACY_ASSET_URL', env('LEGACY_WEBSITE_URL', 'https://old.testmaker.pk'));
if (in_array(strtolower((string) parse_url($assetUrl, PHP_URL_HOST)), ['testmaker.pk', 'www.testmaker.pk'], true)) {
    $assetUrl = 'https://old.testmaker.pk';
}

return [
    'asset_root' => env('LEGACY_ASSET_ROOT', 'C:\\xampp\\htdocs\\testmaker'),
    'asset_url' => $assetUrl,
    'memory_limit' => env('LEGACY_TRANSFER_MEMORY_LIMIT', '512M'),
];

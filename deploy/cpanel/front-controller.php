<?php

declare(strict_types=1);

$currentFile = __DIR__.'/_app/current';
$release = is_file($currentFile) ? trim((string) file_get_contents($currentFile)) : '';

if (! preg_match('/\A[0-9a-f]{40}\z/D', $release)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'TestMaker is temporarily unavailable.';

    exit;
}

$entry = __DIR__.'/_app/releases/'.$release.'/public/index.php';

if (! is_file($entry)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'TestMaker is temporarily unavailable.';

    exit;
}

header('X-TestMaker-Release: '.$release);

require $entry;

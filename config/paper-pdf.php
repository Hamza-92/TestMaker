<?php

return [
    'node_path' => env('PAPER_PDF_NODE_PATH', 'node'),
    'browser_path' => env('PAPER_PDF_BROWSER_PATH'),
    'timeout' => (int) env('PAPER_PDF_TIMEOUT', 120),
];

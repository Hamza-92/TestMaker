<?php

return [
    'enabled' => env('TESTBASE_EXPORT_ENABLED', false),
    'installation_id' => env('TESTBASE_EXPORT_INSTALLATION_ID'),
    'token_sha256' => env('TESTBASE_EXPORT_TOKEN_SHA256'),
    'image_hosts' => env('TESTBASE_EXPORT_IMAGE_HOSTS', ''),
];

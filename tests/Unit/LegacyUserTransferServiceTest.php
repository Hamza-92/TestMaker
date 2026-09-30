<?php

use App\Support\LegacyTransfer\LegacyUserTransferService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class);

function invokeLegacyAssetMigration(object $row): array
{
    $method = new ReflectionMethod(LegacyUserTransferService::class, 'migrateAssets');
    $method->setAccessible(true);

    return $method->invoke(new LegacyUserTransferService, $row);
}

beforeEach(function () {
    config([
        'legacy-transfer.asset_root' => storage_path('framework/testing/nonexistent-legacy-assets'),
        'legacy-transfer.asset_url' => 'https://legacy.example',
    ]);
    Storage::fake('public');
});

it('copies every attachment listed on a legacy account', function () {
    Http::fake([
        'https://legacy.example/uploads/admin_attachments/first.jpg' => Http::response('first-file', 200),
        'https://legacy.example/uploads/admin_attachments/second.pdf' => Http::response('second-file', 200),
    ]);

    $assets = invokeLegacyAssetMigration((object) [
        'id' => 42,
        'school_logo' => '',
        'attachments' => json_encode([
            [
                'file_name' => 'first.jpg',
                'original_name' => 'First receipt.jpg',
                'uploaded_at' => '2026-08-01 10:00:00',
            ],
            [
                'file_name' => 'second.pdf',
                'original_name' => 'Second receipt.pdf',
                'uploaded_at' => '2026-08-02 10:00:00',
            ],
        ]),
    ]);

    expect($assets['attachments'])
        ->toHaveCount(2)
        ->and(array_column($assets['attachments'], 'original_name'))
        ->toBe(['First receipt.jpg', 'Second receipt.pdf']);

    foreach ($assets['attachments'] as $attachment) {
        Storage::disk('public')->assertExists($attachment['path']);
    }
});

it('copies available attachments and records unavailable ones without blocking transfer', function () {
    Http::fake([
        'https://legacy.example/uploads/admin_attachments/available.jpg' => Http::response('available-file', 200),
        'https://legacy.example/uploads/admin_attachments/missing.jpg' => Http::response('', 404),
        'https://legacy.example/uploads/admin_attachments/missing-page.jpg' => Http::response('<html>Not found</html>', 200, ['Content-Type' => 'text/html']),
    ]);

    $assets = invokeLegacyAssetMigration((object) [
        'id' => 43,
        'school_logo' => '',
        'attachments' => json_encode([
            ['file_name' => 'available.jpg', 'original_name' => 'Available.jpg'],
            ['file_name' => 'missing.jpg', 'original_name' => 'Missing.jpg'],
            ['file_name' => 'missing-page.jpg', 'original_name' => 'Missing page.jpg'],
        ]),
    ]);

    expect($assets['attachments'])->toHaveCount(1)
        ->and($assets['attachments'][0]['original_name'])->toBe('Available.jpg')
        ->and($assets['missing_attachments'])->toBe(['Missing.jpg', 'Missing page.jpg']);

    Storage::disk('public')->assertExists($assets['attachments'][0]['path']);
});

it('fetches legacy account attachments from the old domain even with a stale asset URL', function () {
    config(['legacy-transfer.asset_url' => 'https://testmaker.pk']);
    Http::fake([
        'https://old.testmaker.pk/uploads/admin_attachments/receipt.jpg' => Http::response('receipt-file', 200),
    ]);

    $assets = invokeLegacyAssetMigration((object) [
        'id' => 44,
        'school_logo' => '',
        'attachments' => json_encode([
            ['file_name' => 'receipt.jpg', 'original_name' => 'Receipt.jpg'],
        ]),
    ]);

    expect($assets['attachments'])->toHaveCount(1)
        ->and($assets['missing_attachments'])->toBe([]);

    Http::assertSent(fn ($request) => $request->url() === 'https://old.testmaker.pk/uploads/admin_attachments/receipt.jpg');
});

<?php

use App\Http\Controllers\Api\TestbaseExportController;
use Illuminate\Support\Facades\Route;

Route::prefix('testbase-export/v1')
    ->middleware(['testbase.export', 'throttle:240,1'])
    ->group(function (): void {
        Route::get('capabilities', [TestbaseExportController::class, 'capabilities']);
        Route::get('catalog', [TestbaseExportController::class, 'catalog']);
        Route::get('scope', [TestbaseExportController::class, 'scope']);
        Route::get('questions', [TestbaseExportController::class, 'questions']);
        Route::get('assets/{assetId}', [TestbaseExportController::class, 'asset']);
    });

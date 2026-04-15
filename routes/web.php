<?php

use App\Http\Controllers\Superadmin\CustomerController;
use App\Http\Controllers\Superadmin\CustomerSubscriptionController;
use App\Http\Controllers\Superadmin\PatternController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('superadmin/customers', [CustomerController::class, 'index'])->name('superadmin.customers');
    Route::get('superadmin/customers/add', [CustomerController::class, 'create'])->name('superadmin.customers.add');
    Route::post('superadmin/customers', [CustomerController::class, 'store'])->name('superadmin.customers.store');
    Route::get('superadmin/customers/{customer}/edit', [CustomerController::class, 'edit'])->name('superadmin.customers.edit');
    Route::put('superadmin/customers/{customer}', [CustomerController::class, 'update'])->name('superadmin.customers.update');
    Route::get('superadmin/customers/{customer}/logs/{log}', [CustomerController::class, 'showLog'])->name('superadmin.customers.logs.show');
    Route::get('superadmin/customers/{customer}', [CustomerController::class, 'show'])->name('superadmin.customers.show');
    Route::get('superadmin/customers/{customer}/subscriptions/add', [CustomerSubscriptionController::class, 'create'])
        ->name('superadmin.customers.subscriptions.add');
    Route::post('superadmin/customers/{customer}/subscriptions', [CustomerSubscriptionController::class, 'store'])
        ->name('superadmin.customers.subscriptions.store');

    Route::get('superadmin/patterns', [PatternController::class, 'index'])->name('superadmin.patterns');
    Route::get('superadmin/patterns/add', [PatternController::class, 'create'])->name('superadmin.patterns.add');
    Route::post('superadmin/patterns', [PatternController::class, 'store'])->name('superadmin.patterns.store');
    Route::get('superadmin/patterns/{pattern}/edit', [PatternController::class, 'edit'])->name('superadmin.patterns.edit');
    Route::put('superadmin/patterns/{pattern}', [PatternController::class, 'update'])->name('superadmin.patterns.update');
    Route::delete('superadmin/patterns/{pattern}', [PatternController::class, 'destroy'])->name('superadmin.patterns.destroy');
});

require __DIR__.'/settings.php';

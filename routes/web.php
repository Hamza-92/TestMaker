<?php

use App\Http\Controllers\Superadmin\CustomerController;
use App\Http\Controllers\Superadmin\CustomerSubscriptionController;
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
    Route::get('superadmin/customers/{customer}', [CustomerController::class, 'show'])->name('superadmin.customers.show');
    Route::get('superadmin/customers/{customer}/subscriptions/add', [CustomerSubscriptionController::class, 'create'])
        ->name('superadmin.customers.subscriptions.add');
    Route::post('superadmin/customers/{customer}/subscriptions', [CustomerSubscriptionController::class, 'store'])
        ->name('superadmin.customers.subscriptions.store');
});

require __DIR__.'/settings.php';

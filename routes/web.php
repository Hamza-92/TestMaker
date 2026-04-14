<?php

use App\Http\Controllers\Superadmin\CustomerController;
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
});

require __DIR__.'/settings.php';

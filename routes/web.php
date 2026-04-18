<?php

use App\Http\Controllers\Superadmin\CustomerController;
use App\Http\Controllers\Superadmin\CustomerSubscriptionController;
use App\Http\Controllers\Superadmin\ClassController;
use App\Http\Controllers\Superadmin\PatternController;
use App\Http\Controllers\Superadmin\ChapterController;
use App\Http\Controllers\Superadmin\SubjectController;
use App\Http\Controllers\Superadmin\TopicController;
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
    Route::get('superadmin/customers/{customer}/subscriptions/{subscription}', [CustomerSubscriptionController::class, 'show'])
        ->name('superadmin.customers.subscriptions.show');
    Route::get('superadmin/customers/{customer}/subscriptions/{subscription}/edit', [CustomerSubscriptionController::class, 'edit'])
        ->name('superadmin.customers.subscriptions.edit');
    Route::put('superadmin/customers/{customer}/subscriptions/{subscription}', [CustomerSubscriptionController::class, 'update'])
        ->name('superadmin.customers.subscriptions.update');
    Route::post('superadmin/customers/{customer}/subscriptions/{subscription}/payment-logs', [CustomerSubscriptionController::class, 'storePaymentLog'])
        ->name('superadmin.customers.subscriptions.payment-logs.store');
    Route::put('superadmin/customers/{customer}/subscriptions/{subscription}/payment-logs/{paymentLog}', [CustomerSubscriptionController::class, 'updatePaymentLog'])
        ->name('superadmin.customers.subscriptions.payment-logs.update');
    Route::patch('superadmin/customers/{customer}/subscriptions/{subscription}/payment-logs/{paymentLog}/review', [CustomerSubscriptionController::class, 'reviewPaymentLog'])
        ->name('superadmin.customers.subscriptions.payment-logs.review');

    Route::get('superadmin/patterns', [PatternController::class, 'index'])->name('superadmin.patterns');
    Route::get('superadmin/patterns/add', [PatternController::class, 'create'])->name('superadmin.patterns.add');
    Route::post('superadmin/patterns', [PatternController::class, 'store'])->name('superadmin.patterns.store');
    Route::get('superadmin/patterns/{pattern}', [PatternController::class, 'show'])->name('superadmin.patterns.show');
    Route::get('superadmin/patterns/{pattern}/edit', [PatternController::class, 'edit'])->name('superadmin.patterns.edit');
    Route::put('superadmin/patterns/{pattern}', [PatternController::class, 'update'])->name('superadmin.patterns.update');
    Route::delete('superadmin/patterns/{pattern}', [PatternController::class, 'destroy'])->name('superadmin.patterns.destroy');

    Route::get('superadmin/classes', [ClassController::class, 'index'])->name('superadmin.classes');
    Route::get('superadmin/classes/add', [ClassController::class, 'create'])->name('superadmin.classes.add');
    Route::post('superadmin/classes', [ClassController::class, 'store'])->name('superadmin.classes.store');
    Route::get('superadmin/classes/{class}', [ClassController::class, 'show'])->name('superadmin.classes.show');
    Route::get('superadmin/classes/{class}/edit', [ClassController::class, 'edit'])->name('superadmin.classes.edit');
    Route::put('superadmin/classes/{class}', [ClassController::class, 'update'])->name('superadmin.classes.update');
    Route::delete('superadmin/classes/{class}', [ClassController::class, 'destroy'])->name('superadmin.classes.destroy');

    Route::get('superadmin/subjects', [SubjectController::class, 'index'])->name('superadmin.subjects');
    Route::get('superadmin/subjects/add', [SubjectController::class, 'create'])->name('superadmin.subjects.add');
    Route::post('superadmin/subjects', [SubjectController::class, 'store'])->name('superadmin.subjects.store');
    Route::get('superadmin/subjects/{subject}', [SubjectController::class, 'show'])->name('superadmin.subjects.show');
    Route::get('superadmin/subjects/{subject}/edit', [SubjectController::class, 'edit'])->name('superadmin.subjects.edit');
    Route::put('superadmin/subjects/{subject}', [SubjectController::class, 'update'])->name('superadmin.subjects.update');
    Route::delete('superadmin/subjects/{subject}', [SubjectController::class, 'destroy'])->name('superadmin.subjects.destroy');

    Route::post('superadmin/subjects/{subject}/chapters', [ChapterController::class, 'store'])->name('superadmin.subjects.chapters.store');
    Route::put('superadmin/subjects/{subject}/chapters/{chapter}', [ChapterController::class, 'update'])->name('superadmin.subjects.chapters.update');
    Route::delete('superadmin/subjects/{subject}/chapters/{chapter}', [ChapterController::class, 'destroy'])->name('superadmin.subjects.chapters.destroy');

    Route::post('superadmin/subjects/{subject}/chapters/{chapter}/topics', [TopicController::class, 'store'])->name('superadmin.subjects.chapters.topics.store');
    Route::put('superadmin/subjects/{subject}/chapters/{chapter}/topics/{topic}', [TopicController::class, 'update'])->name('superadmin.subjects.chapters.topics.update');
    Route::delete('superadmin/subjects/{subject}/chapters/{chapter}/topics/{topic}', [TopicController::class, 'destroy'])->name('superadmin.subjects.chapters.topics.destroy');
});

require __DIR__.'/settings.php';

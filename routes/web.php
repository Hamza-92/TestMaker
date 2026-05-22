<?php

use App\Http\Controllers\Customer\GeneratePaperController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Superadmin\ChapterController;
use App\Http\Controllers\Superadmin\ClassController;
use App\Http\Controllers\Superadmin\CustomerController;
use App\Http\Controllers\Superadmin\CustomerSubscriptionController;
use App\Http\Controllers\Superadmin\PatternController;
use App\Http\Controllers\Superadmin\QuestionController;
use App\Http\Controllers\Superadmin\QuestionTypeController;
use App\Http\Controllers\Superadmin\SubjectController;
use App\Http\Controllers\Superadmin\SuperadminUserController;
use App\Http\Controllers\Superadmin\TopicController;
use App\Http\Controllers\Superadmin\TrialSettingController;
use App\Http\Controllers\Superadmin\UserPermissionController;
use App\Enums\UserType;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    // ─── Shared smart dashboard (renders based on user type) ─────────────────
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // ─── Customer / Teacher app ───────────────────────────────────────────────
    Route::middleware('app.user')->group(function () {
        Route::get('papers/generate', [GeneratePaperController::class, 'index'])->name('customer.papers.generate');
        Route::get('papers/generate/chapters', [GeneratePaperController::class, 'chapters'])->name('customer.papers.generate.chapters');
    });

    // ─── Superadmin ───────────────────────────────────────────────────────────
    Route::middleware('superadmin')->group(function () {

    // ─── Customers ───────────────────────────────────────────────────────────
    Route::get('superadmin/customers', [CustomerController::class, 'index'])->name('superadmin.customers')->middleware('permission:customers.view');
    Route::get('superadmin/customers/add', [CustomerController::class, 'create'])->name('superadmin.customers.add')->middleware('permission:customers.create');
    Route::post('superadmin/customers', [CustomerController::class, 'store'])->name('superadmin.customers.store')->middleware('permission:customers.create');
    Route::get('superadmin/customers/{customer}/edit', [CustomerController::class, 'edit'])->name('superadmin.customers.edit')->middleware('permission:customers.edit');
    Route::put('superadmin/customers/{customer}', [CustomerController::class, 'update'])->name('superadmin.customers.update')->middleware('permission:customers.edit');
    Route::get('superadmin/customers/{customer}/logs/{log}', [CustomerController::class, 'showLog'])->name('superadmin.customers.logs.show')->middleware('permission:customers.view');
    Route::get('superadmin/customers/{customer}', [CustomerController::class, 'show'])->name('superadmin.customers.show')->middleware('permission:customers.view');

    // ─── Subscriptions ───────────────────────────────────────────────────────
    Route::get('superadmin/customers/{customer}/subscriptions/add', [CustomerSubscriptionController::class, 'create'])->name('superadmin.customers.subscriptions.add')->middleware('permission:subscriptions.create');
    Route::post('superadmin/customers/{customer}/subscriptions', [CustomerSubscriptionController::class, 'store'])->name('superadmin.customers.subscriptions.store')->middleware('permission:subscriptions.create');
    Route::get('superadmin/customers/{customer}/subscriptions/{subscription}', [CustomerSubscriptionController::class, 'show'])->name('superadmin.customers.subscriptions.show')->middleware('permission:subscriptions.view');
    Route::get('superadmin/customers/{customer}/subscriptions/{subscription}/edit', [CustomerSubscriptionController::class, 'edit'])->name('superadmin.customers.subscriptions.edit')->middleware('permission:subscriptions.edit');
    Route::put('superadmin/customers/{customer}/subscriptions/{subscription}', [CustomerSubscriptionController::class, 'update'])->name('superadmin.customers.subscriptions.update')->middleware('permission:subscriptions.edit');
    Route::post('superadmin/customers/{customer}/subscriptions/{subscription}/payment-logs', [CustomerSubscriptionController::class, 'storePaymentLog'])->name('superadmin.customers.subscriptions.payment-logs.store')->middleware('permission:subscriptions.manage_payments');
    Route::put('superadmin/customers/{customer}/subscriptions/{subscription}/payment-logs/{paymentLog}', [CustomerSubscriptionController::class, 'updatePaymentLog'])->name('superadmin.customers.subscriptions.payment-logs.update')->middleware('permission:subscriptions.manage_payments');
    Route::patch('superadmin/customers/{customer}/subscriptions/{subscription}/payment-logs/{paymentLog}/review', [CustomerSubscriptionController::class, 'reviewPaymentLog'])->name('superadmin.customers.subscriptions.payment-logs.review')->middleware('permission:subscriptions.manage_payments');

    // ─── Patterns ────────────────────────────────────────────────────────────
    Route::get('superadmin/patterns', [PatternController::class, 'index'])->name('superadmin.patterns')->middleware('permission:patterns.view');
    Route::get('superadmin/patterns/add', [PatternController::class, 'create'])->name('superadmin.patterns.add')->middleware('permission:patterns.create');
    Route::post('superadmin/patterns', [PatternController::class, 'store'])->name('superadmin.patterns.store')->middleware('permission:patterns.create');
    Route::get('superadmin/patterns/{pattern}/edit', [PatternController::class, 'edit'])->name('superadmin.patterns.edit')->middleware('permission:patterns.edit');
    Route::put('superadmin/patterns/{pattern}', [PatternController::class, 'update'])->name('superadmin.patterns.update')->middleware('permission:patterns.edit');
    Route::delete('superadmin/patterns/{pattern}', [PatternController::class, 'destroy'])->name('superadmin.patterns.destroy')->middleware('permission:patterns.delete');
    Route::get('superadmin/patterns/{pattern}/classes/{class}', [PatternController::class, 'showClass'])->name('superadmin.patterns.classes.show')->middleware('permission:patterns.view');
    Route::get('superadmin/patterns/{pattern}', [PatternController::class, 'show'])->name('superadmin.patterns.show')->middleware('permission:patterns.view');

    // ─── Classes ─────────────────────────────────────────────────────────────
    Route::get('superadmin/classes', [ClassController::class, 'index'])->name('superadmin.classes')->middleware('permission:classes.view');
    Route::get('superadmin/classes/add', [ClassController::class, 'create'])->name('superadmin.classes.add')->middleware('permission:classes.create');
    Route::post('superadmin/classes', [ClassController::class, 'store'])->name('superadmin.classes.store')->middleware('permission:classes.create');
    Route::get('superadmin/classes/{class}/edit', [ClassController::class, 'edit'])->name('superadmin.classes.edit')->middleware('permission:classes.edit');
    Route::put('superadmin/classes/{class}', [ClassController::class, 'update'])->name('superadmin.classes.update')->middleware('permission:classes.edit');
    Route::delete('superadmin/classes/{class}', [ClassController::class, 'destroy'])->name('superadmin.classes.destroy')->middleware('permission:classes.delete');
    Route::get('superadmin/classes/{class}', [ClassController::class, 'show'])->name('superadmin.classes.show')->middleware('permission:classes.view');

    // ─── Subjects ────────────────────────────────────────────────────────────
    Route::get('superadmin/subjects', [SubjectController::class, 'index'])->name('superadmin.subjects')->middleware('permission:subjects.view');
    Route::get('superadmin/subjects/add', [SubjectController::class, 'create'])->name('superadmin.subjects.add')->middleware('permission:subjects.create');
    Route::post('superadmin/subjects', [SubjectController::class, 'store'])->name('superadmin.subjects.store')->middleware('permission:subjects.create');
    Route::get('superadmin/subjects/{subject}/edit', [SubjectController::class, 'edit'])->name('superadmin.subjects.edit')->middleware('permission:subjects.edit');
    Route::put('superadmin/subjects/{subject}', [SubjectController::class, 'update'])->name('superadmin.subjects.update')->middleware('permission:subjects.edit');
    Route::delete('superadmin/subjects/{subject}', [SubjectController::class, 'destroy'])->name('superadmin.subjects.destroy')->middleware('permission:subjects.delete');
    Route::get('superadmin/subjects/{subject}', [SubjectController::class, 'show'])->name('superadmin.subjects.show')->middleware('permission:subjects.view');

    // ─── Chapters ────────────────────────────────────────────────────────────
    Route::post('superadmin/subjects/{subject}/chapters', [ChapterController::class, 'store'])->name('superadmin.subjects.chapters.store')->middleware('permission:subjects.create');
    Route::put('superadmin/subjects/{subject}/chapters/{chapter}', [ChapterController::class, 'update'])->name('superadmin.subjects.chapters.update')->middleware('permission:subjects.edit');
    Route::delete('superadmin/subjects/{subject}/chapters/{chapter}', [ChapterController::class, 'destroy'])->name('superadmin.subjects.chapters.destroy')->middleware('permission:subjects.delete');

    // ─── Topics ──────────────────────────────────────────────────────────────
    Route::post('superadmin/subjects/{subject}/chapters/{chapter}/topics', [TopicController::class, 'store'])->name('superadmin.subjects.chapters.topics.store')->middleware('permission:subjects.create');
    Route::put('superadmin/subjects/{subject}/chapters/{chapter}/topics/{topic}', [TopicController::class, 'update'])->name('superadmin.subjects.chapters.topics.update')->middleware('permission:subjects.edit');
    Route::delete('superadmin/subjects/{subject}/chapters/{chapter}/topics/{topic}', [TopicController::class, 'destroy'])->name('superadmin.subjects.chapters.topics.destroy')->middleware('permission:subjects.delete');

    // ─── Questions (subject-scoped) ───────────────────────────────────────────
    Route::get('superadmin/subjects/{subject}/chapters/{chapter}/questions', [QuestionController::class, 'chapterIndex'])->name('superadmin.subjects.chapters.questions')->middleware('permission:questions.view');
    Route::get('superadmin/subjects/{subject}/chapters/{chapter}/questions/add', [QuestionController::class, 'createForChapter'])->name('superadmin.subjects.chapters.questions.add')->middleware('permission:questions.create');
    Route::get('superadmin/subjects/{subject}/chapters/{chapter}/questions/import', [QuestionController::class, 'importForChapter'])->name('superadmin.subjects.chapters.questions.import')->middleware('permission:questions.import');
    Route::get('superadmin/subjects/{subject}/chapters/{chapter}/topics/{topic}/questions', [QuestionController::class, 'topicIndex'])->name('superadmin.subjects.chapters.topics.questions')->middleware('permission:questions.view');
    Route::get('superadmin/subjects/{subject}/chapters/{chapter}/topics/{topic}/questions/add', [QuestionController::class, 'createForTopic'])->name('superadmin.subjects.chapters.topics.questions.add')->middleware('permission:questions.create');

    // ─── Question Types ───────────────────────────────────────────────────────
    Route::get('superadmin/question-types', [QuestionTypeController::class, 'index'])->name('superadmin.question-types')->middleware('permission:question_types.view');
    Route::get('superadmin/question-types/add', [QuestionTypeController::class, 'create'])->name('superadmin.question-types.add')->middleware('permission:question_types.create');
    Route::get('superadmin/question-types/objective', [QuestionTypeController::class, 'objectiveIndex'])->name('superadmin.question-types.objective')->middleware('permission:question_types.view');
    Route::get('superadmin/question-types/objective/add', [QuestionTypeController::class, 'createObjective'])->name('superadmin.question-types.objective.add')->middleware('permission:question_types.create');
    Route::get('superadmin/question-types/subjective', [QuestionTypeController::class, 'subjectiveIndex'])->name('superadmin.question-types.subjective')->middleware('permission:question_types.view');
    Route::get('superadmin/question-types/subjective/add', [QuestionTypeController::class, 'createSubjective'])->name('superadmin.question-types.subjective.add')->middleware('permission:question_types.create');
    Route::get('superadmin/question-types/objective/{questionType}/edit', [QuestionTypeController::class, 'editFromObjective'])->name('superadmin.question-types.objective.edit')->middleware('permission:question_types.edit');
    Route::get('superadmin/question-types/subjective/{questionType}/edit', [QuestionTypeController::class, 'editFromSubjective'])->name('superadmin.question-types.subjective.edit')->middleware('permission:question_types.edit');
    Route::get('superadmin/question-types/objective/{questionType}', [QuestionTypeController::class, 'showFromObjective'])->name('superadmin.question-types.objective.show')->middleware('permission:question_types.view');
    Route::get('superadmin/question-types/subjective/{questionType}', [QuestionTypeController::class, 'showFromSubjective'])->name('superadmin.question-types.subjective.show')->middleware('permission:question_types.view');
    Route::post('superadmin/question-types', [QuestionTypeController::class, 'store'])->name('superadmin.question-types.store')->middleware('permission:question_types.create');
    Route::get('superadmin/question-types/{questionType}/edit', [QuestionTypeController::class, 'edit'])->name('superadmin.question-types.edit')->middleware('permission:question_types.edit');
    Route::put('superadmin/question-types/{questionType}', [QuestionTypeController::class, 'update'])->name('superadmin.question-types.update')->middleware('permission:question_types.edit');
    Route::delete('superadmin/question-types/{questionType}', [QuestionTypeController::class, 'destroy'])->name('superadmin.question-types.destroy')->middleware('permission:question_types.delete');
    Route::get('superadmin/question-types/{questionType}', [QuestionTypeController::class, 'show'])->name('superadmin.question-types.show')->middleware('permission:question_types.view');

    // ─── Questions ────────────────────────────────────────────────────────────
    Route::get('superadmin/questions', [QuestionController::class, 'index'])->name('superadmin.questions')->middleware('permission:questions.view');
    Route::get('superadmin/questions/add', [QuestionController::class, 'create'])->name('superadmin.questions.add')->middleware('permission:questions.create');
    Route::get('superadmin/questions/import', [QuestionController::class, 'import'])->name('superadmin.questions.import')->middleware('permission:questions.import');
    Route::post('superadmin/questions/import/preview', [QuestionController::class, 'previewImport'])->name('superadmin.questions.import.preview')->middleware('permission:questions.import');
    Route::post('superadmin/questions/import', [QuestionController::class, 'storeImport'])->name('superadmin.questions.import.store')->middleware('permission:questions.import');
    Route::get('superadmin/questions/import/template', [QuestionController::class, 'downloadImportTemplate'])->name('superadmin.questions.import.template')->middleware('permission:questions.import');
    Route::get('superadmin/questions/chapters/{chapter}/add', [QuestionController::class, 'createForChapterClean'])->name('superadmin.questions.chapters.add')->middleware('permission:questions.create');
    Route::get('superadmin/questions/chapters/{chapter}/topics/{topic}/add', [QuestionController::class, 'createForTopicClean'])->name('superadmin.questions.chapters.topics.add')->middleware('permission:questions.create');
    Route::get('superadmin/questions/chapters/{chapter}/topics/{topic}', [QuestionController::class, 'topicFilter'])->name('superadmin.questions.topic')->middleware('permission:questions.view');
    Route::get('superadmin/questions/chapters/{chapter}', [QuestionController::class, 'chapterFilter'])->name('superadmin.questions.chapter')->middleware('permission:questions.view');
    Route::post('superadmin/questions', [QuestionController::class, 'store'])->name('superadmin.questions.store')->middleware('permission:questions.create');
    Route::get('superadmin/questions/{question}/edit', [QuestionController::class, 'edit'])->name('superadmin.questions.edit')->middleware('permission:questions.edit');
    Route::put('superadmin/questions/{question}', [QuestionController::class, 'update'])->name('superadmin.questions.update')->middleware('permission:questions.edit');
    Route::delete('superadmin/questions/{question}', [QuestionController::class, 'destroy'])->name('superadmin.questions.destroy')->middleware('permission:questions.delete');
    Route::get('superadmin/questions/{question}', [QuestionController::class, 'show'])->name('superadmin.questions.show')->middleware('permission:questions.view');

    // ─── Trial Settings ───────────────────────────────────────────────────────
    Route::get('superadmin/trial-settings', [TrialSettingController::class, 'index'])->name('superadmin.trial-settings')->middleware('permission:trial_settings.edit');
    Route::put('superadmin/trial-settings', [TrialSettingController::class, 'update'])->name('superadmin.trial-settings.update')->middleware('permission:trial_settings.edit');

    // ─── Superadmin Users ─────────────────────────────────────────────────────
    Route::get('superadmin/users', [SuperadminUserController::class, 'index'])->name('superadmin.users')->middleware('permission:users.view');
    Route::get('superadmin/users/add', [SuperadminUserController::class, 'create'])->name('superadmin.users.add')->middleware('permission:users.create');
    Route::post('superadmin/users', [SuperadminUserController::class, 'store'])->name('superadmin.users.store')->middleware('permission:users.create');
    Route::get('superadmin/users/{user}/permissions', [UserPermissionController::class, 'edit'])->name('superadmin.users.permissions')->middleware('permission:users.manage_permissions');
    Route::put('superadmin/users/{user}/permissions', [UserPermissionController::class, 'update'])->name('superadmin.users.permissions.update')->middleware('permission:users.manage_permissions');
    Route::get('superadmin/users/{user}/edit', [SuperadminUserController::class, 'edit'])->name('superadmin.users.edit')->middleware('permission:users.edit');
    Route::put('superadmin/users/{user}', [SuperadminUserController::class, 'update'])->name('superadmin.users.update')->middleware('permission:users.edit');
    Route::delete('superadmin/users/{user}', [SuperadminUserController::class, 'destroy'])->name('superadmin.users.destroy')->middleware('permission:users.delete');

    }); // end superadmin group
});

// this route will be just kept until the app is fully developed and live, after it, this route will be deleted
Route::get('/run-migrate', function () {
    Artisan::call('migrate');

    return Artisan::output();
});

Route::get('/run-optimize-clear', function () {
    Artisan::call('optimize:clear');

    return Artisan::output();
});

Route::get('/run-optimize', function () {
    Artisan::call('optimize');

    return Artisan::output();
});

Route::get('/run-seed', function () {
    // Only seeds safe, idempotent seeders — never recreates users
    Artisan::call('db:seed', ['--class' => 'PermissionSeeder', '--force' => true]);
    $out = trim(Artisan::output()) ?: '(no output)';

    Artisan::call('db:seed', ['--class' => 'MediumSeeder', '--force' => true]);
    $out .= "\n" . (trim(Artisan::output()) ?: '(no output)');

    return response($out, 200)->header('Content-Type', 'text/plain');
});

Route::get('/run-assign-permissions', function () {
    $allIds = Permission::pluck('id');

    if ($allIds->isEmpty()) {
        return response("No permissions found — run /run-seed first.", 200)
            ->header('Content-Type', 'text/plain');
    }

    $users = User::where('user_type', UserType::SuperAdmin)
        ->whereNotNull('created_by')
        ->get();

    if ($users->isEmpty()) {
        return response("No non-master superadmin users found.", 200)
            ->header('Content-Type', 'text/plain');
    }

    $output = '';
    foreach ($users as $user) {
        $user->permissions()->syncWithoutDetaching($allIds);
        Cache::forget("user_permissions_{$user->id}");
        $output .= "✓ Assigned all {$allIds->count()} permissions to: {$user->name} ({$user->email})\n";
    }

    return response($output, 200)->header('Content-Type', 'text/plain');
});

Route::get('/run-wayfinder', function () {
    Artisan::call('wayfinder:generate');

    return Artisan::output();
});

Route::get('/run-all', function () {
    $output = '';

    // Step 1-5: artisan commands
    $commands = [
        ['optimize:clear', []],
        ['migrate', ['--force' => true]],
        ['db:seed', ['--class' => 'MediumSeeder', '--force' => true]],
        ['db:seed', ['--class' => 'PermissionSeeder', '--force' => true]],
        ['optimize', []],
    ];

    foreach ($commands as [$command, $args]) {
        Artisan::call($command, $args);
        $result = trim(Artisan::output());
        $label = $command . (isset($args['--class']) ? " ({$args['--class']})" : '');
        $output .= "▶ {$label}\n" . ($result ?: '(no output)') . "\n\n";
    }

    // Step 6: assign all permissions to non-master superadmins
    $allIds = Permission::pluck('id');
    $users  = User::where('user_type', UserType::SuperAdmin)->whereNotNull('created_by')->get();

    foreach ($users as $user) {
        $user->permissions()->syncWithoutDetaching($allIds);
        Cache::forget("user_permissions_{$user->id}");
        $output .= "✓ Permissions assigned to: {$user->name} ({$user->email})\n";
    }

    return response($output, 200)->header('Content-Type', 'text/plain');
});

require __DIR__.'/settings.php';

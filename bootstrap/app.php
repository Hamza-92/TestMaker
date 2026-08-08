<?php

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\EnsureAppUser;
use App\Http\Middleware\EnsureSchoolOwner;
use App\Http\Middleware\EnsureSchoolSubscriptionFeature;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\EnsureTeacherFeature;
use App\Http\Middleware\EnsureNonCustomer;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::using(20),
        ]);

        $middleware->alias([
            'permission'      => CheckPermission::class,
            'superadmin'      => EnsureSuperAdmin::class,
            'app.user'        => EnsureAppUser::class,
            'school.owner'    => EnsureSchoolOwner::class,
            'school.feature'  => EnsureSchoolSubscriptionFeature::class,
            'teacher.feature' => EnsureTeacherFeature::class,
            'non.customer'   => EnsureNonCustomer::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();





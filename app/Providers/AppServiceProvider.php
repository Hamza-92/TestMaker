<?php

namespace App\Providers;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->defineGates();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function defineGates(): void
    {
        // Master superadmin (created_by = null) bypasses all permission checks.
        Gate::before(function (User $user, string $ability) {
            if ($user->isMasterSuperAdmin()) {
                return true;
            }
        });

        $permissions = [
            'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
            'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.manage_payments',
            'patterns.view', 'patterns.create', 'patterns.edit', 'patterns.delete',
            'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
            'subjects.view', 'subjects.create', 'subjects.edit', 'subjects.delete',
            'question_types.view', 'question_types.create', 'question_types.edit', 'question_types.delete',
            'questions.view', 'questions.create', 'questions.edit', 'questions.delete', 'questions.import',
            'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_permissions',
        ];

        foreach ($permissions as $permission) {
            Gate::define($permission, fn (User $user) => $user->isSuperAdmin() && $user->hasPermission($permission));
        }
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}

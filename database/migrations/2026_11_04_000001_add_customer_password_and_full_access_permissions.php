<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissions = [
            ['name' => 'customers.reset_password', 'display_name' => 'Reset Customer Password', 'group' => 'Customers'],
            ['name' => 'app.full_access', 'display_name' => 'Full Access Except Payments', 'group' => 'App Access'],
        ];

        foreach ($permissions as $permission) {
            DB::table('permissions')->insertOrIgnore($permission + [
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Preserve grants assigned after deployment.
    }
};

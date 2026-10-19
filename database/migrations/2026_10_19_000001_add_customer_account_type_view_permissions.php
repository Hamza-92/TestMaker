<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('permissions')->where('name', 'customers.view')
            ->update(['display_name' => 'View All Customers']);

        foreach (['paid' => 'View Paid Customers', 'trial' => 'View Trial Customers'] as $type => $label) {
            DB::table('permissions')->insertOrIgnore([
                'name' => "customers.{$type}.view",
                'display_name' => $label,
                'group' => 'Customers',
                'updated_at' => now(),
                'created_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Preserve any grants assigned after this migration ran.
    }
};

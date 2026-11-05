<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['view' => 'View Arabic Subjects', 'edit' => 'Edit Arabic Subjects'] as $action => $label) {
            DB::table('permissions')->insertOrIgnore([
                'name' => "arabic_subjects.{$action}",
                'display_name' => $label,
                'group' => 'Arabic Subjects',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Preserve permissions assigned after deployment.
    }
};

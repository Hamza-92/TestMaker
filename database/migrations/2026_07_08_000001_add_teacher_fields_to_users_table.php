<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('teacher_permissions')->nullable()->after('created_by');
            $table->json('access_scope')->nullable()->after('teacher_permissions');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['teacher_permissions', 'access_scope']);
        });
    }
};

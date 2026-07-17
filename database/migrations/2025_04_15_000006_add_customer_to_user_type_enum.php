<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('user_type');
            });

            Schema::table('users', function (Blueprint $table) {
                $table->enum('user_type', ['super_admin', 'staff', 'teacher', 'customer'])->default('teacher')->after('logo');
            });

            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin', 'staff', 'teacher', 'customer') DEFAULT 'teacher'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('user_type');
            });

            Schema::table('users', function (Blueprint $table) {
                $table->enum('user_type', ['super_admin', 'staff', 'teacher'])->default('teacher')->after('logo');
            });

            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin', 'staff', 'teacher') DEFAULT 'teacher'");
    }
};

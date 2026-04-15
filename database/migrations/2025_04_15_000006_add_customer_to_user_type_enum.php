<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin', 'staff', 'teacher', 'customer') DEFAULT 'teacher'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin', 'staff', 'teacher') DEFAULT 'teacher'");
    }
};

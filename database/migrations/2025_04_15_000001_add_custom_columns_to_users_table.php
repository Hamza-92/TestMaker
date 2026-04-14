<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Profile
            $table->string('address')->nullable()->after('password');
            $table->string('city')->nullable()->after('address');
            $table->string('province')->nullable()->after('city');
            $table->boolean('is_show_address')->default(false)->after('province');

            // School
            $table->string('school_name')->nullable()->after('is_show_address');
            $table->string('logo')->nullable()->after('school_name');

            // Role & hierarchy
            $table->enum('user_type', ['super_admin', 'staff', 'teacher'])->default('teacher')->after('logo');
            $table->foreignId('school_id')
                  ->nullable()
                  ->after('user_type')
                  ->constrained('users')
                  ->nullOnDelete();

            // Account
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active')->after('school_id');
            $table->foreignId('created_by')
                  ->nullable()
                  ->after('status')
                  ->constrained('users')
                  ->nullOnDelete();

            // Soft deletes
            $table->softDeletes()->after('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn([
                'address', 'city', 'province', 'is_show_address',
                'school_name', 'logo', 'user_type', 'status', 'deleted_at',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chapters', function (Blueprint $table): void {
            $table->string('group_name', 300)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('chapters', function (Blueprint $table): void {
            $table->string('group_name', 100)->nullable()->change();
        });
    }
};

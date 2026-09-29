<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['classes', 'subjects'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->string('color', 7)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['classes', 'subjects'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn('color');
            });
        }
    }
};

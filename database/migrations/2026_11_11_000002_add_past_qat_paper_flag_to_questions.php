<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['questions', 'qat_questions'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->boolean('is_past_qat_paper')->default(false);
            });
        }
    }

    public function down(): void
    {
        foreach (['questions', 'qat_questions'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->dropColumn('is_past_qat_paper');
            });
        }
    }
};

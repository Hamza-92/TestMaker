<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qat_subjects', function (Blueprint $table): void {
            $table->json('question_type_rules')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('qat_subjects', function (Blueprint $table): void {
            $table->dropColumn('question_type_rules');
        });
    }
};

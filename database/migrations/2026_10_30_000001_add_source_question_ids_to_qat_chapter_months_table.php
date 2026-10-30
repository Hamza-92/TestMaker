<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qat_chapter_months', function (Blueprint $table): void {
            // Null retains the existing behaviour: every copied question in this chapter.
            $table->json('source_question_ids')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('qat_chapter_months', function (Blueprint $table): void {
            $table->dropColumn('source_question_ids');
        });
    }
};

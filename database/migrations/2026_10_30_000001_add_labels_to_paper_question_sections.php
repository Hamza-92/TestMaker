<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('paper_question_section_scopes', function (Blueprint $table) {
            $table->boolean('show_objective_section')->default(true);
            $table->string('objective_label_en')->nullable();
            $table->string('objective_label_ur')->nullable();
        });

        Schema::table('paper_question_sections', function (Blueprint $table) {
            $table->string('label_en')->nullable();
            $table->string('label_ur')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('paper_question_sections', function (Blueprint $table) {
            $table->dropColumn(['label_en', 'label_ur']);
        });

        Schema::table('paper_question_section_scopes', function (Blueprint $table) {
            $table->dropColumn(['show_objective_section', 'objective_label_en', 'objective_label_ur']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paper_question_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['pattern_id', 'class_id', 'subject_id', 'sort_order'], 'paper_sections_scope_order_unique');
            $table->index(['pattern_id', 'class_id', 'subject_id'], 'paper_sections_scope_index');
        });

        Schema::create('paper_question_section_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('paper_question_sections')->cascadeOnDelete();
            $table->foreignId('question_type_id')->constrained('question_types')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['section_id', 'question_type_id'], 'paper_section_members_section_type_unique');
            $table->index('question_type_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paper_question_section_members');
        Schema::dropIfExists('paper_question_sections');
    }
};

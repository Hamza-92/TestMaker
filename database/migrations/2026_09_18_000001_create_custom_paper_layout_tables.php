<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_paper_layouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->boolean('is_active')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['pattern_id', 'class_id', 'subject_id'], 'custom_paper_layouts_scope_unique');
        });

        Schema::create('custom_paper_layout_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('layout_id')->constrained('custom_paper_layouts')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order');
            $table->timestamps();
            $table->unique(['layout_id', 'sort_order']);
        });

        Schema::create('custom_paper_layout_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('custom_paper_layout_sections')->cascadeOnDelete();
            $table->foreignId('question_type_id')->constrained('question_types')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order');
            $table->unsignedSmallInteger('shared_number_group')->nullable();
            $table->unsignedSmallInteger('or_group')->nullable();
            $table->timestamps();
            $table->unique(['section_id', 'question_type_id']);
            $table->index('question_type_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_paper_layout_items');
        Schema::dropIfExists('custom_paper_layout_sections');
        Schema::dropIfExists('custom_paper_layouts');
    }
};

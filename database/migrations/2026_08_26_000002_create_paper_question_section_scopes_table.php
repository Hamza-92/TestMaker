<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paper_question_section_scopes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->boolean('is_active')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['pattern_id', 'class_id', 'subject_id'], 'paper_section_scopes_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paper_question_section_scopes');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subjective_column_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_type_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('columns')->default(1);
            $table->boolean('apply_to_both')->default(false);
            $table->timestamps();

            $table->unique(['pattern_id', 'class_id', 'subject_id', 'question_type_id'], 'subjective_column_scope_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subjective_column_settings');
    }
};

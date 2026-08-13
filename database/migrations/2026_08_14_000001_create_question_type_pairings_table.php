<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_type_pairings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('question_type_a_id')->constrained('question_types')->cascadeOnDelete();
            $table->foreignId('question_type_b_id')->constrained('question_types')->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['pattern_id', 'class_id', 'subject_id', 'question_type_a_id', 'question_type_b_id'],
                'question_type_pairings_scope_types_unique',
            );
            $table->index(
                ['pattern_id', 'class_id', 'subject_id', 'is_active'],
                'question_type_pairings_scope_active_index',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_type_pairings');
    }
};

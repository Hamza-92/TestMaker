<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_type_id')->constrained('question_types')->restrictOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained('topics')->cascadeOnDelete();
            $table->foreignId('chapter_id')->nullable()->constrained('chapters')->cascadeOnDelete();
            $table->text('statement_en')->nullable();
            $table->text('statement_ur')->nullable();
            $table->text('description_en')->nullable();
            $table->text('description_ur')->nullable();
            $table->text('answer_en')->nullable();
            $table->text('answer_ur')->nullable();
            $table->string('source', 100)->nullable()->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['chapter_id', 'topic_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};

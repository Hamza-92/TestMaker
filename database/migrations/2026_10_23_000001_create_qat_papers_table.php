<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qat_papers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('mode', 8);
            $table->json('class_ids');
            $table->string('class_names')->nullable();
            $table->string('subject_name')->nullable();
            $table->decimal('total_marks', 10, 2)->default(0);
            $table->unsignedInteger('question_count')->default(0);
            $table->json('paper_data');
            $table->boolean('is_draft')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'is_draft', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qat_papers');
    }
};

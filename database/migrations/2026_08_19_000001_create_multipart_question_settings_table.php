<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('multipart_question_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->boolean('is_active')->default(false);
            $table->unsignedTinyInteger('max_parts')->default(2);
            $table->unsignedTinyInteger('choice_count')->default(1);
            $table->string('heading_en')->nullable();
            $table->text('heading_ur')->nullable();
            $table->json('part_type_ids');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['pattern_id', 'class_id', 'subject_id'],
                'multipart_question_settings_scope_unique',
            );
            $table->index(
                ['pattern_id', 'class_id', 'subject_id', 'is_active'],
                'multipart_question_settings_scope_active_index',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('multipart_question_settings');
    }
};

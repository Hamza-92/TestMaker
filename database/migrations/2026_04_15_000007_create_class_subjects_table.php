<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_subjects', function (Blueprint $table) {
            $table->id();

            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('medium_id')->nullable()->constrained('mediums')->nullOnDelete();

            $table->unique(['class_id', 'subject_id', 'medium_id']);

            $table->index('class_id');
            $table->index('subject_id');
            $table->index('medium_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_subjects');
    }
};

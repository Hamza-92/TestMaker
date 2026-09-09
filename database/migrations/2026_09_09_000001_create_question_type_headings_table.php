<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_type_headings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pattern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->nullable()->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->cascadeOnDelete();
            // A non-null key also enforces uniqueness for all-class/all-subject scopes in MySQL.
            $table->string('scope_key', 80);
            $table->string('heading_en', 150)->nullable();
            $table->string('heading_ur', 150)->nullable();
            $table->timestamps();
            $table->unique(['question_type_id', 'scope_key']);
            $table->index('scope_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_type_headings');
    }
};

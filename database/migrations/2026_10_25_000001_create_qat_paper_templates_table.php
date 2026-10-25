<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qat_paper_templates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('qat_subject_id')->constrained('qat_subjects')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('category', 80)->nullable();
            $table->unsignedSmallInteger('minutes');
            $table->json('sections');
            $table->boolean('status')->default(true);
            $table->timestamps();
            $table->index(['qat_subject_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qat_paper_templates');
    }
};

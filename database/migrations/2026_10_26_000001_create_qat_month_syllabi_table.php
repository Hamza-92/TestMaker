<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qat_month_syllabi', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('qat_subject_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('month');
            $table->text('description');
            $table->timestamps();
            $table->unique(['qat_subject_id', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qat_month_syllabi');
    }
};

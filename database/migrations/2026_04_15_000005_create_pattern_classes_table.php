<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pattern_classes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();

            $table->unique(['pattern_id', 'class_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pattern_classes');
    }
};

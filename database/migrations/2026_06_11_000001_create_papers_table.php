<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('papers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('subject', 150)->nullable();
            $table->string('class_name', 150)->nullable();
            $table->unsignedInteger('total_marks')->default(0);
            $table->json('paper_data');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('papers');
    }
};

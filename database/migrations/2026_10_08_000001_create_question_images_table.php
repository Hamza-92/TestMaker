<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_images', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('mime_type', 50);
            $table->mediumText('data');
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_images');
    }
};

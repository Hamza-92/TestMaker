<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_media', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('mime_type', 30);
            $table->unsignedInteger('byte_size');
            $table->string('alt_text')->nullable();
            $table->string('caption')->nullable();
            $table->longText('data_base64');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_media');
    }
};

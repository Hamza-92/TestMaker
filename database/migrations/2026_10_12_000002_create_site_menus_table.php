<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_menus', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('draft_items');
            $table->json('published_items')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_menus');
    }
};

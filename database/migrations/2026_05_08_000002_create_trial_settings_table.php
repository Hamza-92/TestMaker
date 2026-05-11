<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trial_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('trial_duration_days')->default(30);
            $table->json('access_scope')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trial_settings');
    }
};

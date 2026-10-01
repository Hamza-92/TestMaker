<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trial_settings', function (Blueprint $table) {
            $table->json('chapter_access')->nullable();
            $table->json('topic_access')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('trial_settings', function (Blueprint $table) {
            $table->dropColumn(['chapter_access', 'topic_access']);
        });
    }
};

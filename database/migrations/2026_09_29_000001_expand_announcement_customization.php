<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table): void {
            $table->text('title')->change();
            $table->unsignedTinyInteger('banner_font_size')->nullable();
            $table->unsignedTinyInteger('banner_summary_font_size')->nullable();
            $table->unsignedSmallInteger('banner_font_weight')->nullable();
            $table->unsignedSmallInteger('banner_scroll_duration')->nullable();
        });
    }

    public function down(): void
    {
        // Keep the expanded title column so rolling back cannot truncate saved news.
        Schema::table('announcements', function (Blueprint $table): void {
            $table->dropColumn([
                'banner_font_size',
                'banner_summary_font_size',
                'banner_font_weight',
                'banner_scroll_duration',
            ]);
        });
    }
};

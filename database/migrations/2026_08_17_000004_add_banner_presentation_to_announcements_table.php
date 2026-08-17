<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table): void {
            $table->string('banner_style', 20)->default('standard')->after('placement');
            $table->string('banner_direction', 10)->default('auto')->after('banner_style');
            $table->string('banner_font', 20)->default('default')->after('banner_direction');
            $table->string('banner_background', 20)->nullable()->after('banner_font');
            $table->string('banner_text_color', 20)->nullable()->after('banner_background');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table): void {
            $table->dropColumn([
                'banner_style',
                'banner_direction',
                'banner_font',
                'banner_background',
                'banner_text_color',
            ]);
        });
    }
};

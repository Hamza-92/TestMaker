<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chapters', function (Blueprint $table) {
            $table->string('group_name', 100)->nullable()->after('chapter_number')->index();
            $table->string('group_heading', 150)->nullable()->after('group_name');
        });
    }

    public function down(): void
    {
        Schema::table('chapters', function (Blueprint $table) {
            $table->dropIndex(['group_name']);
            $table->dropColumn(['group_name', 'group_heading']);
        });
    }
};

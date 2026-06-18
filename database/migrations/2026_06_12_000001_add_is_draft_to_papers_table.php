<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('papers', function (Blueprint $table) {
            $table->boolean('is_draft')->default(false)->after('paper_data');
        });
    }

    public function down(): void
    {
        Schema::table('papers', function (Blueprint $table) {
            $table->dropColumn('is_draft');
        });
    }
};

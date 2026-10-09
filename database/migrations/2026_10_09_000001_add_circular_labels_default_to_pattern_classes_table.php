<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pattern_classes', function (Blueprint $table) {
            $table->boolean('circular_labels_default')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('pattern_classes', function (Blueprint $table) {
            $table->dropColumn('circular_labels_default');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('papers', function (Blueprint $table) {
            $table->decimal('total_marks', 10, 2)->unsigned()->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('papers', function (Blueprint $table) {
            $table->unsignedInteger('total_marks')->default(0)->change();
        });
    }
};

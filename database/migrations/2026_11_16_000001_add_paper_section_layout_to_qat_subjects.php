<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qat_subjects', function (Blueprint $table): void {
            $table->json('paper_section_layout')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('qat_subjects', function (Blueprint $table): void {
            $table->dropColumn('paper_section_layout');
        });
    }
};

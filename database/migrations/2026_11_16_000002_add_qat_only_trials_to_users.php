<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('qat_trial_ends_on')->nullable();
            $table->unsignedTinyInteger('qat_trial_papers_used')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['qat_trial_ends_on', 'qat_trial_papers_used']);
        });
    }
};

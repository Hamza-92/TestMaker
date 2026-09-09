<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->boolean('allow_subjective_answers')
                ->default(false)
                ->after('allow_online_mcq_tests');
        });

        Schema::table('trial_settings', function (Blueprint $table) {
            $table->boolean('allow_subjective_answers')
                ->default(false)
                ->after('trial_duration_days');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('allow_subjective_answers');
        });

        Schema::table('trial_settings', function (Blueprint $table) {
            $table->dropColumn('allow_subjective_answers');
        });
    }
};

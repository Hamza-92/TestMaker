<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('online_tests', function (Blueprint $table) {
            $table->string('timing_mode', 20)->default('whole_test')->after('duration_minutes');
            $table->unsignedInteger('question_time_seconds')->nullable()->after('timing_mode');
            $table->boolean('auto_advance')->default(false)->after('question_time_seconds');
            $table->boolean('allow_back_navigation')->default(false)->after('auto_advance');
            $table->boolean('allow_skip')->default(false)->after('allow_back_navigation');
            $table->boolean('shuffle_questions')->default(false)->after('allow_skip');
            $table->boolean('shuffle_options')->default(false)->after('shuffle_questions');
            $table->string('focus_loss_action', 20)->default('allow')->after('shuffle_options');
            $table->boolean('require_fullscreen')->default(false)->after('focus_loss_action');
            $table->boolean('show_result')->default(true)->after('require_fullscreen');
            $table->boolean('show_correct_answers')->default(false)->after('show_result');
            $table->unsignedTinyInteger('passing_percentage')->default(40)->after('show_correct_answers');
            $table->timestamp('available_from')->nullable()->after('passing_percentage');
            $table->timestamp('available_until')->nullable()->after('available_from');
        });

        Schema::table('online_test_attempts', function (Blueprint $table) {
            $table->unsignedInteger('furthest_index')->default(0)->after('current_index');
            $table->json('question_order')->nullable()->after('total_questions');
            $table->unsignedInteger('focus_loss_count')->default(0)->after('question_order');
            $table->timestamp('question_started_at')->nullable()->after('started_at');
        });
    }

    public function down(): void
    {
        Schema::table('online_test_attempts', function (Blueprint $table) {
            $table->dropColumn([
                'furthest_index',
                'question_order',
                'focus_loss_count',
                'question_started_at',
            ]);
        });

        Schema::table('online_tests', function (Blueprint $table) {
            $table->dropColumn([
                'timing_mode',
                'question_time_seconds',
                'auto_advance',
                'allow_back_navigation',
                'allow_skip',
                'shuffle_questions',
                'shuffle_options',
                'focus_loss_action',
                'require_fullscreen',
                'show_result',
                'show_correct_answers',
                'passing_percentage',
                'available_from',
                'available_until',
            ]);
        });
    }
};

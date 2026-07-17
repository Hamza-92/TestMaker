<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A failed CREATE can leave untracked partial tables in MySQL. Since this
        // migration is still pending, clear only this new module before retrying.
        Schema::dropIfExists('online_test_answers');
        Schema::dropIfExists('online_test_attempts');
        Schema::dropIfExists('online_test_questions');
        Schema::dropIfExists('online_tests');

        Schema::create('online_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('title');
            $table->text('instructions')->nullable();
            $table->unsignedInteger('duration_minutes');
            $table->string('status', 20)->default('draft')->index();
            $table->string('share_token')->nullable()->unique();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('online_test_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('online_test_id')->constrained('online_tests')->cascadeOnDelete();
            $table->foreignId('question_id')->nullable()->constrained('questions')->nullOnDelete();
            $table->foreignId('question_type_id')->nullable()->constrained('question_types')->nullOnDelete();
            $table->foreignId('chapter_id')->nullable()->constrained('chapters')->nullOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained('topics')->nullOnDelete();
            $table->json('payload');
            $table->string('correct_option_key', 20);
            $table->unsignedInteger('marks')->default(1);
            $table->unsignedInteger('sort_order')->default(1);
            $table->timestamps();
        });

        Schema::create('online_test_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('online_test_id')->constrained('online_tests')->cascadeOnDelete();
            $table->string('attempt_token')->unique();
            $table->string('student_name');
            $table->string('student_class');
            $table->string('roll_number');
            $table->string('roll_number_normalized');
            $table->string('status', 20)->default('in_progress')->index();
            $table->unsignedInteger('current_index')->default(0);
            $table->unsignedInteger('score')->default(0);
            $table->unsignedInteger('total_questions')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['online_test_id', 'roll_number_normalized'], 'ot_attempt_roll_unique');
        });

        Schema::create('online_test_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('online_test_attempt_id')->constrained('online_test_attempts')->cascadeOnDelete();
            $table->foreignId('online_test_question_id')->constrained('online_test_questions')->cascadeOnDelete();
            $table->string('selected_option_key', 20);
            $table->boolean('is_correct')->default(false);
            $table->timestamp('answered_at')->nullable();
            $table->timestamps();

            $table->unique(['online_test_attempt_id', 'online_test_question_id'], 'ot_answer_attempt_question_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('online_test_answers');
        Schema::dropIfExists('online_test_attempts');
        Schema::dropIfExists('online_test_questions');
        Schema::dropIfExists('online_tests');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->boolean('allow_qat_tests')->default(false);
        });

        Schema::create('qat_catalogues', function (Blueprint $table): void {
            $table->id();
            $table->string('academic_year', 7)->unique();
            $table->timestamps();
        });

        Schema::create('qat_subjects', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('qat_catalogue_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('class_id');
            $table->string('class_name', 150);
            $table->unsignedBigInteger('subject_id');
            $table->string('subject_name', 150);
            $table->unsignedBigInteger('source_pattern_id');
            $table->string('source_pattern_name', 100);
            $table->timestamps();
            $table->unique(['qat_catalogue_id', 'class_id', 'subject_id']);
        });

        Schema::create('qat_chapters', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('qat_subject_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('source_chapter_id');
            $table->string('name', 150);
            $table->string('name_ur', 150)->nullable();
            $table->unsignedInteger('chapter_number')->nullable();
            $table->integer('sort_id')->default(0);
            $table->boolean('status')->default(true);
            $table->timestamps();
            $table->unique(['qat_subject_id', 'source_chapter_id']);
        });

        Schema::create('qat_chapter_months', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('qat_chapter_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('month');
            $table->unique(['qat_chapter_id', 'month']);
        });

        Schema::create('qat_topics', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('qat_chapter_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('source_topic_id');
            $table->string('name', 150);
            $table->string('name_ur', 150)->nullable();
            $table->integer('sort_id')->default(0);
            $table->boolean('status')->default(true);
            $table->timestamps();
            $table->unique(['qat_chapter_id', 'source_topic_id']);
        });

        Schema::create('qat_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('qat_chapter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('qat_topic_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('source_question_id');
            $table->unsignedBigInteger('question_type_id');
            $table->boolean('status')->default(true);
            $table->json('question_data');
            $table->timestamps();
            $table->unique(['qat_chapter_id', 'source_question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qat_questions');
        Schema::dropIfExists('qat_topics');
        Schema::dropIfExists('qat_chapter_months');
        Schema::dropIfExists('qat_chapters');
        Schema::dropIfExists('qat_subjects');
        Schema::dropIfExists('qat_catalogues');
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropColumn('allow_qat_tests');
        });
    }
};

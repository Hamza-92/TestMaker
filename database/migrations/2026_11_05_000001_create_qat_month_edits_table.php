<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qat_month_edits', function (Blueprint $table): void {
            $table->id();
            $table->string('kind', 12);
            $table->unsignedBigInteger('record_id');
            $table->unsignedTinyInteger('month');
            $table->string('name', 150)->nullable();
            $table->string('name_ur', 150)->nullable();
            $table->boolean('status')->nullable();
            $table->boolean('is_removed')->default(false);
            $table->integer('sort_id')->nullable();
            $table->unsignedInteger('chapter_number')->nullable();
            $table->unsignedBigInteger('question_type_id')->nullable();
            $table->unsignedBigInteger('qat_topic_id')->nullable();
            $table->json('question_data')->nullable();
            $table->unique(['kind', 'record_id', 'month']);
        });

        Schema::table('qat_chapter_months', function (Blueprint $table): void {
            $table->json('excluded_source_question_ids')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('qat_chapter_months', function (Blueprint $table): void {
            $table->dropColumn('excluded_source_question_ids');
        });
        Schema::dropIfExists('qat_month_edits');
    }
};

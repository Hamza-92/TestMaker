<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('smart_syllabus_excluded_chapters', function (Blueprint $table) {
            $table->foreignId('chapter_id')->primary()->constrained()->cascadeOnDelete();
        });

        Schema::create('smart_syllabus_excluded_topics', function (Blueprint $table) {
            $table->foreignId('topic_id')->primary()->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('smart_syllabus_excluded_topics');
        Schema::dropIfExists('smart_syllabus_excluded_chapters');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table): void {
            $table->index(
                ['chapter_id', 'status', 'source', 'question_type_id'],
                'questions_availability_lookup_index',
            );
            $table->index(
                ['chapter_id', 'question_type_id', 'topic_id', 'sort_order', 'id'],
                'questions_chapter_type_order_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table): void {
            $table->dropIndex('questions_availability_lookup_index');
            $table->dropIndex('questions_chapter_type_order_index');
        });
    }
};

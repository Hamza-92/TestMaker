<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->string('schema_key', 80)->nullable()->after('question_type_id');
            $table->index('schema_key');
        });

        // Preserve the structure of every existing question before types are consolidated.
        DB::statement(
            'UPDATE questions SET schema_key = (SELECT schema_key FROM question_types WHERE question_types.id = questions.question_type_id) WHERE schema_key IS NULL'
        );

        Schema::table('question_type_headings', function (Blueprint $table) {
            $table->string('schema_key', 80)->nullable()->after('heading_ur');
            $table->boolean('question_text_rtl')->nullable()->after('schema_key');
            $table->unsignedTinyInteger('column_per_row')->nullable()->after('question_text_rtl');
        });
    }

    public function down(): void
    {
        Schema::table('question_type_headings', function (Blueprint $table) {
            $table->dropColumn(['schema_key', 'question_text_rtl', 'column_per_row']);
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex(['schema_key']);
            $table->dropColumn('schema_key');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('question_types', function (Blueprint $table) {
            $table->string('schema_key', 80)->nullable()->after('is_objective');
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->json('content')->nullable()->after('answer_ur');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('content');
        });

        Schema::table('question_types', function (Blueprint $table) {
            $table->dropColumn('schema_key');
        });
    }
};

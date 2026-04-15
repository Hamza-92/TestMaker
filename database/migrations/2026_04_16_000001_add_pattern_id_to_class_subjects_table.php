<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_subjects', function (Blueprint $table) {
            // Drop the old unique key before changing the schema
            $table->dropUnique(['class_id', 'subject_id', 'medium_id']);

            $table->foreignId('pattern_id')
                ->after('class_id')
                ->constrained('patterns')
                ->cascadeOnDelete();

            // New unique key: a subject is unique per class+pattern combination
            $table->unique(['class_id', 'pattern_id', 'subject_id']);
            $table->index('pattern_id');
        });
    }

    public function down(): void
    {
        Schema::table('class_subjects', function (Blueprint $table) {
            $table->dropUnique(['class_id', 'pattern_id', 'subject_id']);
            $table->dropIndex(['pattern_id']);
            $table->dropForeign(['pattern_id']);
            $table->dropColumn('pattern_id');

            $table->unique(['class_id', 'subject_id', 'medium_id']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table): void {
            $table->foreignId('medium_id')
                ->nullable()
                ->after('question_type_id')
                ->constrained('mediums')
                ->nullOnDelete();

            $table->index('medium_id');
        });

        $bothMediumId = DB::table('mediums')
            ->where('name', 'Both')
            ->value('id');

        if ($bothMediumId !== null) {
            DB::table('questions')
                ->whereNull('medium_id')
                ->update(['medium_id' => $bothMediumId]);
        }
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table): void {
            $table->dropForeign(['medium_id']);
            $table->dropIndex(['medium_id']);
            $table->dropColumn('medium_id');
        });
    }
};

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
            $table->unsignedInteger('sort_order')->default(0)->after('status');
            $table->index(
                ['chapter_id', 'topic_id', 'question_type_id', 'sort_order'],
                'questions_scope_sort_order_index',
            );
        });

        $positions = [];

        DB::table('questions')
            ->select(['id', 'chapter_id', 'topic_id', 'question_type_id'])
            ->orderBy('id')
            ->chunkById(1000, function ($questions) use (&$positions): void {
                $orders = [];

                foreach ($questions as $question) {
                    $scope = implode(':', [
                        (int) $question->chapter_id,
                        $question->topic_id === null ? 'none' : (int) $question->topic_id,
                        (int) $question->question_type_id,
                    ]);
                    $positions[$scope] = ($positions[$scope] ?? 0) + 1;
                    $orders[(int) $question->id] = $positions[$scope];
                }

                if ($orders !== []) {
                    $cases = collect($orders)
                        ->map(fn (int $position, int $id) => "WHEN {$id} THEN {$position}")
                        ->implode(' ');
                    $ids = implode(',', array_keys($orders));

                    DB::statement(
                        "UPDATE questions SET sort_order = CASE id {$cases} END WHERE id IN ({$ids})",
                    );
                }
            });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex('questions_scope_sort_order_index');
            $table->dropColumn('sort_order');
        });
    }
};

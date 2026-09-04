<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_subjects', function (Blueprint $table) {
            $table->enum('subject_type', ['chapter-wise', 'topic-wise'])
                ->nullable()
                ->after('subject_id');
            $table->index('subject_type');
        });

        DB::table('class_subjects')
            ->orderBy('id')
            ->chunkById(500, function ($links): void {
                $subjectTypes = DB::table('subjects')
                    ->whereIn('id', $links->pluck('subject_id')->unique())
                    ->pluck('subject_type', 'id');

                foreach ($links as $link) {
                    DB::table('class_subjects')
                        ->where('id', $link->id)
                        ->update([
                            'subject_type' => $subjectTypes[$link->subject_id] ?? 'chapter-wise',
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('class_subjects', function (Blueprint $table) {
            $table->dropIndex(['subject_type']);
            $table->dropColumn('subject_type');
        });
    }
};

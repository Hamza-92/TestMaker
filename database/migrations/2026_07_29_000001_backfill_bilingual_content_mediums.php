<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('mediums') || ! Schema::hasTable('questions') || ! Schema::hasTable('class_subjects')) {
            return;
        }

        $mediumIds = DB::table('mediums')
            ->pluck('id', 'name')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (! isset($mediumIds['English'], $mediumIds['Urdu'], $mediumIds['Both'])) {
            return;
        }

        DB::table('questions')
            ->select([
                'id',
                'statement_en',
                'statement_ur',
                'description_en',
                'description_ur',
                'answer_en',
                'answer_ur',
                'content',
                'medium_id',
            ])
            ->orderBy('id')
            ->chunkById(250, function ($questions) use ($mediumIds): void {
                foreach ($questions as $question) {
                    $content = json_decode((string) $question->content, true);
                    $content = is_array($content) ? $content : [];
                    $hasEnglish = $this->filled($question->statement_en)
                        || $this->filled($question->description_en)
                        || $this->filled($question->answer_en)
                        || $this->hasLocalizedContent($content, 'en');
                    $hasUrdu = $this->filled($question->statement_ur)
                        || $this->filled($question->description_ur)
                        || $this->filled($question->answer_ur)
                        || $this->hasLocalizedContent($content, 'ur');
                    $medium = $hasEnglish && $hasUrdu
                        ? 'Both'
                        : ($hasUrdu ? 'Urdu' : 'English');

                    if ((int) $question->medium_id !== $mediumIds[$medium]) {
                        DB::table('questions')->where('id', $question->id)->update([
                            'medium_id' => $mediumIds[$medium],
                        ]);
                    }
                }
            });

        DB::table('class_subjects')
            ->orderBy('id')
            ->chunkById(100, function ($links) use ($mediumIds): void {
                foreach ($links as $link) {
                    $questionMedia = DB::table('questions')
                        ->join('chapters', 'chapters.id', '=', 'questions.chapter_id')
                        ->where('chapters.pattern_id', $link->pattern_id)
                        ->where('chapters.class_id', $link->class_id)
                        ->where('chapters.subject_id', $link->subject_id)
                        ->whereNotNull('questions.medium_id')
                        ->distinct()
                        ->pluck('questions.medium_id')
                        ->map(fn ($id) => (int) $id)
                        ->all();
                    $hasBoth = in_array($mediumIds['Both'], $questionMedia, true)
                        || (
                            in_array($mediumIds['English'], $questionMedia, true)
                            && in_array($mediumIds['Urdu'], $questionMedia, true)
                        );
                    $medium = $hasBoth
                        ? 'Both'
                        : (in_array($mediumIds['Urdu'], $questionMedia, true) ? 'Urdu' : 'English');

                    DB::table('class_subjects')->where('id', $link->id)->update([
                        'medium_id' => $mediumIds[$medium],
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Keep corrected classifications; clearing them would discard valid data.
    }

    private function hasLocalizedContent(array $content, string $locale): bool
    {
        foreach ($content as $key => $value) {
            if ($key === 'options') {
                continue;
            }

            if (
                is_string($key)
                && str_ends_with($key, "_{$locale}")
                && ! is_array($value)
                && $this->filled($value)
            ) {
                return true;
            }

            if (is_array($value) && $this->hasLocalizedContent($value, $locale)) {
                return true;
            }
        }

        return false;
    }

    private function filled(mixed $value): bool
    {
        return trim((string) $value) !== '';
    }
};

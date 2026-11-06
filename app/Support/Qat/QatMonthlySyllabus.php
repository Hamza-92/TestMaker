<?php

namespace App\Support\Qat;

use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class QatMonthlySyllabus
{
    public static function requestedMonth(Request $request): ?int
    {
        $value = $request->query('month');
        if ($value === null) {
            return null;
        }

        $month = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 12]]);
        abort_if($month === false, 404);

        return $month;
    }

    public static function query(string $table, string $kind, ?int $month, string $alias): Builder
    {
        return $month === null ? DB::table($table.' as '.$alias) : DB::query()->fromSub(self::records($kind, $month), $alias);
    }

    public static function records(string $kind, int $month): Builder
    {
        [$table, $identity, $editable] = match ($kind) {
            'class' => ['qat_classes', ['qat_catalogue_id', 'source_class_id'], ['name', 'status']],
            'subject' => ['qat_subjects', ['qat_catalogue_id', 'qat_class_id', 'class_id', 'subject_id', 'source_pattern_id', 'source_pattern_name'], ['subject_name', 'status']],
            'chapter' => ['qat_chapters', ['qat_subject_id', 'source_chapter_id'], ['name', 'name_ur', 'status', 'sort_id', 'chapter_number']],
            'topic' => ['qat_topics', ['qat_chapter_id', 'source_topic_id'], ['name', 'name_ur', 'status', 'sort_id']],
            'question' => ['qat_questions', ['qat_chapter_id', 'source_question_id'], ['question_type_id', 'qat_topic_id', 'question_data', 'status']],
        };

        $query = DB::table($table.' as original')
            ->select(array_map(fn ($column) => 'original.'.$column, ['id', ...$identity]));
        self::joinEdit($query, $kind, 'original.id', $month, 'edit');

        foreach ($editable as $column) {
            $override = $column === 'subject_name' ? 'name' : $column;
            $fallback = $kind === 'question' && $column !== 'status' ? 'edit.question_data is null' : 'edit.id is null';
            $query->selectRaw("case when $fallback then original.$column else edit.$override end as $column");
        }

        if ($kind === 'topic') {
            $query->where(fn (Builder $topic) => $topic->whereNull('edit.id')->orWhere('edit.is_removed', false));
        }
        if ($kind === 'question') {
            $sourceId = DB::raw(DB::connection()->getDriverName() === 'sqlite'
                ? 'original.source_question_id' : 'cast(original.source_question_id as char)');
            $query->join('qat_chapter_months as mapping', fn (JoinClause $join) => $join
                ->on('mapping.qat_chapter_id', '=', 'original.qat_chapter_id')->where('mapping.month', $month))
                ->where(fn (Builder $selection) => $selection->whereNull('mapping.source_question_ids')
                    ->orWhereJsonContains('mapping.source_question_ids', $sourceId))
                ->where(fn (Builder $selection) => $selection->whereNull('mapping.excluded_source_question_ids')
                    ->orWhereJsonDoesntContain('mapping.excluded_source_question_ids', $sourceId))
                ->whereNotExists(DB::table('qat_month_edits as removed_topic')
                    ->where('removed_topic.kind', 'topic')->where('removed_topic.month', $month)->where('removed_topic.is_removed', true)
                    ->whereRaw('removed_topic.record_id = case when edit.question_data is null then original.qat_topic_id else edit.qat_topic_id end'));
        }

        return $query;
    }

    public static function joinEdit(Builder $query, string $kind, string $idColumn, int|string $month, string $alias): void
    {
        $query->leftJoin('qat_month_edits as '.$alias, function (JoinClause $join) use ($kind, $idColumn, $month, $alias): void {
            $join->on($alias.'.record_id', '=', $idColumn)->where($alias.'.kind', $kind);

            if (is_int($month)) {
                $join->where($alias.'.month', $month);
            } else {
                $join->on($alias.'.month', '=', $month);
            }
        });
    }

    public static function edit(string $kind, int $id, int $month, array $data): void
    {
        DB::table('qat_month_edits')->upsert(
            [['kind' => $kind, 'record_id' => $id, 'month' => $month, ...$data]],
            ['kind', 'record_id', 'month'],
            array_keys($data),
        );
    }

    public static function originalOrMonthActive(Builder $query, string $kind, string $table, bool $includeMonthly): void
    {
        $query->where(fn (Builder $active) => $active->where($table.'.status', true)
            ->when($includeMonthly, fn (Builder $active) => $active->orWhereExists(DB::table('qat_month_edits')
                ->where('kind', $kind)->whereColumn('record_id', $table.'.id')->where('status', true))));
    }

    public static function activeAssignments(iterable $chapterIds): Builder
    {
        $query = DB::table('qat_chapter_months as mapping')
            ->join('qat_chapters as chapter', 'chapter.id', '=', 'mapping.qat_chapter_id')
            ->join('qat_subjects as subject', 'subject.id', '=', 'chapter.qat_subject_id')
            ->join('qat_classes as class', 'class.id', '=', 'subject.qat_class_id')
            ->whereIn('mapping.qat_chapter_id', $chapterIds);

        foreach (['chapter', 'subject', 'class'] as $kind) {
            self::joinEdit($query, $kind, $kind.'.id', 'mapping.month', $kind.'_edit');
            $query->whereRaw("coalesce({$kind}_edit.status, $kind.status) = ?", [true]);
        }

        return $query->select('mapping.qat_chapter_id', 'mapping.month')
            ->selectRaw('coalesce(chapter_edit.name, chapter.name) as name');
    }

    public static function description(int $subjectId, int $month, ?string $description): void
    {
        $description = trim((string) $description);
        if ($description === '') {
            DB::table('qat_month_syllabi')->where('qat_subject_id', $subjectId)->where('month', $month)->delete();

            return;
        }

        DB::table('qat_month_syllabi')->upsert([[
            'qat_subject_id' => $subjectId,
            'month' => $month,
            'description' => $description,
            'created_at' => now(),
            'updated_at' => now(),
        ]], ['qat_subject_id', 'month'], ['description', 'updated_at']);
    }

    public static function excludeQuestions(int $chapterId, int $month, array $sourceIds): void
    {
        $mapping = DB::table('qat_chapter_months')->where('qat_chapter_id', $chapterId)->where('month', $month);
        $saved = (clone $mapping)->lockForUpdate()->first(['excluded_source_question_ids']);
        abort_unless($saved, 404);
        $excluded = json_decode($saved->excluded_source_question_ids ?? '[]', true) ?: [];
        $mapping->update(['excluded_source_question_ids' => json_encode(array_values(array_unique([...$excluded, ...$sourceIds])))]);
    }
}

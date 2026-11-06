<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\QuestionType;
use App\Support\Qat\QatMonthlySyllabus;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class QatMonthlyDataController extends Controller
{
    private const URL = '/superadmin/qat-catalogue';

    public function years(): Response
    {
        $years = DB::table('qat_catalogues')->orderByDesc('academic_year')->get(['id', 'academic_year']);

        return Inertia::render('superadmin/qat-catalogue/monthly', [
            'level' => 'year',
            'title' => 'Academic years',
            'breadcrumbs' => [],
            'rows' => $years->map(fn ($year) => [
                'id' => $year->id,
                'name' => $year->academic_year,
                'count' => $this->monthSubjects($year->id)->distinct()->count('month'),
                'url' => self::URL.'/years/'.$year->id,
            ]),
        ]);
    }

    public function months(int $catalogue): Response
    {
        $year = $this->year($catalogue);
        $rows = $this->monthSubjects($catalogue)
            ->select('month')->selectRaw('count(distinct subject_id) as count')
            ->groupBy('month')->orderBy('month')->get()
            ->map(fn ($row) => [
                'id' => $row->month,
                'name' => $this->monthName($row->month),
                'count' => $row->count,
                'url' => $this->monthUrl($catalogue, $row->month),
            ]);

        return Inertia::render('superadmin/qat-catalogue/monthly', [
            'level' => 'month',
            'title' => 'Months',
            'breadcrumbs' => [['label' => $year, 'url' => self::URL.'/years/'.$catalogue]],
            'rows' => $rows,
        ]);
    }

    public function show(Request $request, int $catalogue, int $month): Response
    {
        $year = $this->year($catalogue);
        $monthName = $this->monthName($month);
        $base = $this->monthUrl($catalogue, $month);
        $filters = $request->validate([
            'class' => ['nullable', 'integer', 'min:1'],
            'subject' => ['nullable', 'integer', 'min:1'],
            'chapter' => ['nullable', 'integer', 'min:1'],
            'view' => ['nullable', 'in:questions'],
            'q' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', 'in:all,active,inactive'],
            'topic' => ['nullable', 'integer', 'min:1'],
            'type' => ['nullable', 'integer', 'min:1'],
        ]);
        $breadcrumbs = [
            ['label' => $year, 'url' => self::URL.'/years/'.$catalogue],
            ['label' => $monthName, 'url' => $base],
        ];
        $parents = [];
        $level = 'class';
        foreach (['class' => 'subject', 'subject' => 'chapter', 'chapter' => 'topic'] as $kind => $next) {
            if (! isset($filters[$kind])) {
                break;
            }

            $id = (int) $filters[$kind];
            $parent = $this->withinParents($this->records($kind, $catalogue, $month), $parents)
                ->where('id', $id)->first();
            abort_unless($parent, 404);
            $parents[$kind] = $id;
            $level = $next;
            $breadcrumbs[] = [
                'label' => $parent->subject_name ?? $parent->name,
                'url' => $base.'?'.http_build_query($parents),
            ];
        }
        abort_if(array_diff_key(array_intersect_key(array_filter($filters), array_flip(['class', 'subject', 'chapter'])), $parents), 404);
        if (isset($filters['view'])) {
            abort_unless(isset($parents['chapter']), 404);
            $level = 'question';
        }
        $query = $this->withinParents($this->records($level, $catalogue, $month), $parents);
        $nameColumn = match ($level) {
            'question' => 'question_data',
            'subject' => 'subject_name',
            default => 'name',
        };
        $query->when(filled($filters['q'] ?? null), fn (Builder $query) => $query->where($nameColumn, 'like', '%'.$filters['q'].'%'))
            ->when(in_array($filters['status'] ?? null, ['active', 'inactive'], true), fn (Builder $query) => $query->where('status', $filters['status'] === 'active'));

        $questions = $this->records('question', $catalogue, $month);
        match ($level) {
            'class' => $query->select('records.*')->selectSub($this->records('subject', $catalogue, $month, 'children')
                ->selectRaw('count(*)')->whereColumn('children.qat_class_id', 'records.id'), 'count')->orderBy('name'),
            'subject' => $query->select('records.*')->selectSub($this->records('chapter', $catalogue, $month, 'children')
                ->selectRaw('count(*)')->whereColumn('children.qat_subject_id', 'records.id'), 'count')->orderBy('subject_name'),
            'chapter' => $query->select('records.*')->selectSub($this->records('question', $catalogue, $month, 'children')
                ->selectRaw('count(*)')->whereColumn('children.qat_chapter_id', 'records.id'), 'count')->orderBy('sort_id'),
            'topic' => $query->select('records.*')->selectSub($this->records('question', $catalogue, $month, 'children')
                ->selectRaw('count(*)')->whereColumn('children.qat_topic_id', 'records.id'), 'count')->orderBy('sort_id'),
            'question' => $query
                ->when(isset($filters['topic']), fn (Builder $query) => $query->where('qat_topic_id', $filters['topic']))
                ->when(isset($filters['type']), fn (Builder $query) => $query->where('question_type_id', $filters['type'])),
        };
        $rows = $query->orderBy('records.id')->paginate(20)->withQueryString();
        $topicOptions = isset($parents['chapter'])
            ? $this->records('topic', $catalogue, $month)->where('qat_chapter_id', $parents['chapter'])->orderBy('sort_id')->get(['id', 'name'])
            : collect();
        $questionTypes = $level === 'question' ? QuestionType::query()
            ->whereIn('id', (clone $questions)->where('qat_chapter_id', $parents['chapter'])->select('question_type_id'))
            ->orderBy('name')->get()->keyBy('id') : collect();
        $typeOptions = $questionTypes->map(fn (QuestionType $type) => $type->only('id', 'name'))->values();
        $topicNames = $topicOptions->pluck('name', 'id');
        $rows->through(function ($row) use ($level, $parents, $base, $month, $questionTypes, $topicNames) {
            if (in_array($level, ['class', 'subject', 'chapter'], true)) {
                $row->url = $base.'?'.http_build_query([...$parents, $level => $row->id]);
            } elseif ($level === 'topic') {
                $row->url = $base.'?'.http_build_query([...$parents, 'view' => 'questions', 'topic' => $row->id]);
            } else {
                $data = json_decode($row->question_data, true) ?: [];
                $content = (array) ($data['content'] ?? []);
                foreach (['en', 'ur'] as $language) {
                    $row->{'statement_'.$language} = collect([
                        $data['statement_'.$language] ?? null, $content['prompt_'.$language] ?? null,
                        $content['passage_'.$language] ?? null, $content['intro_'.$language] ?? null,
                        data_get($content, 'items.0.prompt_'.$language),
                    ])->first(fn ($value) => is_string($value) && trim($value) !== '');
                    $row->{'description_'.$language} = ($data['description_'.$language] ?? null)
                        ?: ($content['shared_'.$language] ?? null) ?: ($content['guidance_'.$language] ?? null);
                }
                $type = $questionTypes->get($row->question_type_id);
                $schemaType = filled($data['schema_key'] ?? null) || ! empty($data['question_type'])
                    ? new QuestionType([...($type?->getAttributes() ?? []), ...(array) ($data['question_type'] ?? []), 'schema_key' => $data['schema_key'] ?? data_get($data, 'question_type.schema_key', $type?->schema_key)])
                    : $type;
                $row->summary_text = $schemaType ? QuestionTypeSchemaRegistry::summarize($schemaType, $content) : 'Question';
                $row->name = $row->statement_en ?: ($row->statement_ur ?: $row->summary_text);
                $row->type_name = $data['question_type']['name'] ?? $type?->name ?? 'Question';
                $row->topic_name = $topicNames->get($row->qat_topic_id);
                $row->edit_url = route('superadmin.qat-catalogue.questions.edit', [
                    'qatClass' => $parents['class'], 'qatSubject' => $parents['subject'], 'qatChapter' => $parents['chapter'],
                    'qatQuestion' => $row->id, 'month' => $month,
                ], false);
                $row->update_url = route('superadmin.qat-catalogue.questions.update', [
                    'qatClass' => $parents['class'], 'qatSubject' => $parents['subject'], 'qatChapter' => $parents['chapter'],
                    'qatQuestion' => $row->id, 'month' => $month,
                ], false);
                unset($row->question_data);
            }
            $row->name ??= $row->subject_name;
            $row->action_url = $base.'/records/'.$level.'/'.$row->id;

            return $row;
        });
        $syllabus = $level === 'chapter' ? [
            'url' => $base.'/subjects/'.$parents['subject'].'/description',
            'description' => DB::table('qat_month_syllabi')->where('qat_subject_id', $parents['subject'])
                ->where('month', $month)->value('description') ?? '',
        ] : null;
        $title = match ($level) {
            'class' => 'Classes',
            'subject' => 'Subjects',
            'chapter' => 'Chapters',
            'topic' => 'Topics',
            'question' => 'Questions',
        };

        return Inertia::render('superadmin/qat-catalogue/monthly', [
            'title' => $title,
            'level' => $level,
            'month' => $monthName,
            'breadcrumbs' => $breadcrumbs,
            'rows' => $rows,
            'filters' => $filters,
            'baseUrl' => $base,
            'context' => [...$parents, ...($level === 'question' ? ['view' => 'questions'] : [])],
            'syllabus' => $syllabus,
            'topics' => $topicOptions,
            'types' => $typeOptions,
        ]);
    }

    public function update(Request $request, int $catalogue, int $month, string $kind, int $record): RedirectResponse
    {
        $this->monthName($month);
        $rules = ['name' => ['required', 'string', 'max:150'], 'status' => ['required', 'boolean']];
        if (in_array($kind, ['chapter', 'topic'], true)) {
            $rules['name_ur'] = ['nullable', 'string', 'max:150'];
            $rules['sort_id'] = ['required', 'integer', 'min:0'];
        }
        if ($kind === 'chapter') {
            $rules['chapter_number'] = ['nullable', 'integer', 'min:0'];
        }
        $data = $request->validate($rules);
        $this->record($kind, $catalogue, $month, $record);
        QatMonthlySyllabus::edit($kind, $record, $month, $data);

        return back();
    }

    public function bulkQuestions(Request $request, int $catalogue, int $month, int $chapter): RedirectResponse
    {
        $this->monthName($month);
        $data = $request->validate([
            'action' => ['required', 'in:activate,deactivate,remove'],
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['required', 'integer', 'distinct', 'min:1'],
        ]);

        DB::transaction(function () use ($catalogue, $month, $chapter, $data): void {
            $this->record('chapter', $catalogue, $month, $chapter);
            abort_unless(DB::table('qat_chapter_months')->where('qat_chapter_id', $chapter)
                ->where('month', $month)->lockForUpdate()->first(), 404);
            $questions = $this->records('question', $catalogue, $month)->where('qat_chapter_id', $chapter)
                ->whereIn('id', $data['ids'])->get(['id', 'source_question_id']);
            abort_unless($questions->count() === count($data['ids']), 404);

            if ($data['action'] === 'remove') {
                QatMonthlySyllabus::excludeQuestions($chapter, $month, $questions->pluck('source_question_id')->map(fn ($id) => (int) $id)->all());
                $this->deleteEdits('question', $month, $data['ids']);

                return;
            }

            foreach ($questions as $question) {
                QatMonthlySyllabus::edit('question', $question->id, $month, [
                    'status' => $data['action'] === 'activate',
                ]);
            }
        });

        return back();
    }

    public function updateDescription(Request $request, int $catalogue, int $month, int $subject): RedirectResponse
    {
        $this->monthName($month);
        $row = $this->record('subject', $catalogue, $month, $subject);
        $data = $request->validate(['description' => ['present', 'nullable', 'string', 'max:15000']]);
        QatMonthlySyllabus::description($subject, $month, $data['description']);

        return $this->returnToMonth($catalogue, $month, ['class' => $row->qat_class_id, 'subject' => $subject]);
    }

    public function destroy(Request $request, int $catalogue, int $month, string $kind, int $record): RedirectResponse
    {
        $this->monthName($month);
        $context = $request->validate([
            'class' => ['nullable', 'integer', 'min:1'],
            'subject' => ['nullable', 'integer', 'min:1'],
            'chapter' => ['nullable', 'integer', 'min:1'],
            'view' => ['nullable', 'in:questions'],
        ]);
        DB::transaction(function () use ($catalogue, $month, $kind, $record): void {
            $row = $this->record($kind, $catalogue, $month, $record);
            if (in_array($kind, ['question', 'topic'], true)) {
                $sourceIds = $kind === 'question' ? [(int) $row->source_question_id] : $this->records('question', $catalogue, $month)
                    ->where('qat_chapter_id', $row->qat_chapter_id)->where('qat_topic_id', $record)
                    ->pluck('source_question_id')->map(fn ($id) => (int) $id)->all();
                QatMonthlySyllabus::excludeQuestions($row->qat_chapter_id, $month, $sourceIds);
                if ($kind === 'topic') {
                    QatMonthlySyllabus::edit('topic', $record, $month, [
                        'name' => $row->name, 'name_ur' => $row->name_ur,
                        'status' => $row->status, 'sort_id' => $row->sort_id, 'is_removed' => true,
                    ]);

                    return;
                }
            } else {
                $subjectIds = match ($kind) {
                    'class' => DB::table('qat_subjects')->where('qat_class_id', $record)->select('id'),
                    'subject' => [$record],
                    default => null,
                };
                $chapterIds = $subjectIds === null ? [$record] : DB::table('qat_chapters')->whereIn('qat_subject_id', $subjectIds)->select('id');
                DB::table('qat_chapter_months')->where('month', $month)->whereIn('qat_chapter_id', $chapterIds)->delete();
                foreach (['question' => 'qat_questions', 'topic' => 'qat_topics'] as $childKind => $table) {
                    $this->deleteEdits($childKind, $month, DB::table($table)->whereIn('qat_chapter_id', $chapterIds)->select('id'));
                }
                $this->deleteEdits('chapter', $month, $chapterIds);
                if ($subjectIds !== null) {
                    DB::table('qat_month_syllabi')->where('month', $month)->whereIn('qat_subject_id', $subjectIds)->delete();
                    $this->deleteEdits('subject', $month, $subjectIds);
                }
            }
            $this->deleteEdits($kind, $month, [$record]);
        });

        return $this->returnToMonth($catalogue, $month, $context);
    }

    private function returnToMonth(int $catalogue, int $month, array $context): RedirectResponse
    {
        if (! $this->monthSubjects($catalogue)->where('month', $month)->exists()) {
            return redirect(self::URL.'/years/'.$catalogue);
        }

        $parents = [];
        foreach (['class', 'subject', 'chapter'] as $kind) {
            if (! isset($context[$kind]) || ! $this->withinParents($this->records($kind, $catalogue, $month), $parents)
                ->where('id', $context[$kind])->exists()) {
                break;
            }

            $parents[$kind] = $context[$kind];
        }
        if (isset($parents['chapter'], $context['view'])) {
            $parents['view'] = $context['view'];
        }

        $url = $this->monthUrl($catalogue, $month);

        return redirect($parents === [] ? $url : $url.'?'.http_build_query($parents));
    }

    private function deleteEdits(string $kind, int $month, array|Builder $ids): void
    {
        DB::table('qat_month_edits')->where('month', $month)->where('kind', $kind)->whereIn('record_id', $ids)->delete();
    }

    private function monthSubjects(int $catalogue): Builder
    {
        $chapterMonths = DB::table('qat_chapter_months as mapping')
            ->join('qat_chapters as chapter', 'chapter.id', '=', 'mapping.qat_chapter_id')
            ->join('qat_subjects as subject', 'subject.id', '=', 'chapter.qat_subject_id')
            ->where('subject.qat_catalogue_id', $catalogue)->whereNotNull('subject.qat_class_id')
            ->select('mapping.month', 'subject.id as subject_id');
        $descriptions = DB::table('qat_month_syllabi as syllabus')
            ->join('qat_subjects as subject', 'subject.id', '=', 'syllabus.qat_subject_id')
            ->where('subject.qat_catalogue_id', $catalogue)->whereNotNull('subject.qat_class_id')
            ->select('syllabus.month', 'subject.id as subject_id');

        return DB::query()->fromSub($chapterMonths->union($descriptions), 'monthly_subjects');
    }

    private function records(string $kind, int $catalogue, int $month, string $alias = 'records'): Builder
    {
        $subjects = $this->monthSubjects($catalogue)->where('month', $month)->select('subject_id');
        $chapters = DB::table('qat_chapters')->whereIn('qat_subject_id', $subjects)->select('id');
        $query = DB::query()->fromSub(QatMonthlySyllabus::records($kind, $month), $alias);

        return match ($kind) {
            'class' => $query->where('qat_catalogue_id', $catalogue)->whereIn('id', DB::table('qat_subjects')->whereIn('id', $subjects)->select('qat_class_id')),
            'subject' => $query->whereIn('id', $subjects),
            'chapter' => $query->whereIn('id', $chapters)->whereIn('id', DB::table('qat_chapter_months')->where('month', $month)->select('qat_chapter_id')),
            'topic' => $query->whereIn('qat_chapter_id', $chapters)->whereIn('id', DB::query()
                ->fromSub(QatMonthlySyllabus::records('question', $month), 'included_questions')->select('qat_topic_id')->whereNotNull('qat_topic_id')),
            'question' => $query->whereIn('qat_chapter_id', $chapters),
        };
    }

    private function record(string $kind, int $catalogue, int $month, int $id): object
    {
        $record = $this->records($kind, $catalogue, $month)->where('id', $id)->first();
        abort_unless($record, 404);

        return $record;
    }

    private function withinParents(Builder $query, array $parents): Builder
    {
        if (isset($parents['chapter'])) {
            return $query->where('qat_chapter_id', $parents['chapter']);
        }
        if (isset($parents['subject'])) {
            return $query->where('qat_subject_id', $parents['subject']);
        }
        if (isset($parents['class'])) {
            return $query->where('qat_class_id', $parents['class']);
        }

        return $query;
    }

    private function year(int $id): string
    {
        $year = DB::table('qat_catalogues')->where('id', $id)->value('academic_year');
        abort_unless($year, 404);

        return $year;
    }

    private function monthName(int $month): string
    {
        abort_unless($month >= 1 && $month <= 12, 404);

        return now()->startOfYear()->month($month)->format('F');
    }

    private function monthUrl(int $catalogue, int $month): string
    {
        return self::URL.'/years/'.$catalogue.'/months/'.$month;
    }
}

<?php

namespace App\Http\Controllers\Customer;

use App\Enums\TeacherPermission;
use App\Http\Controllers\Controller;
use App\Models\QatPaper;
use App\Support\AppUserAccess;
use App\Support\Qat\QatPaperBuilder;
use App\Support\SchoolTeacherSummary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class QatCatalogueController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $filters = $request->validate(['q' => ['nullable', 'string', 'max:150']]);
        $search = trim($filters['q'] ?? '');
        $visibleUserIds = $this->visibleUserIds($request);

        $papers = QatPaper::query()->whereIn('user_id', $visibleUserIds)
            ->where('is_draft', false)
            ->when($search !== '', fn ($query) => $query->where(function ($searchQuery) use ($search): void {
                $searchQuery->where('name', 'like', '%'.$search.'%')
                    ->orWhere('class_names', 'like', '%'.$search.'%')
                    ->orWhere('subject_name', 'like', '%'.$search.'%');
            }))
            ->with('user:id,name')
            ->orderByDesc('updated_at')
            ->paginate(12, ['id', 'user_id', 'name', 'mode', 'class_names', 'subject_name',
                'total_marks', 'question_count', 'updated_at'])
            ->withQueryString();
        $papers->getCollection()->transform(fn (QatPaper $paper) => [
            'id' => $paper->id,
            'name' => $paper->name,
            'mode' => $paper->mode,
            'class_names' => $paper->class_names,
            'subject_name' => $paper->subject_name,
            'total_marks' => $paper->total_marks,
            'question_count' => $paper->question_count,
            'updated_at' => $paper->updated_at?->toISOString(),
            'author_name' => (int) $paper->user_id === (int) $user->id ? null : $paper->user?->name,
        ]);

        return Inertia::render('customer/qat/index', [
            'papers' => $papers,
            'filters' => ['q' => $search],
        ]);
    }

    public function create(Request $request, string $mode): Response
    {
        abort_unless(in_array($mode, ['auto', 'manual'], true), 404);
        $initialSelections = $this->initialSelections($request, $mode);

        $user = auth()->user();
        $access = AppUserAccess::resolve($user);
        $scopeRows = DB::table('qat_classes')
            ->join('qat_catalogues', 'qat_catalogues.id', '=', 'qat_classes.qat_catalogue_id')
            ->join('qat_subjects', 'qat_subjects.qat_class_id', '=', 'qat_classes.id')
            ->where('qat_classes.status', true)
            ->where('qat_subjects.status', true)
            ->orderByDesc('qat_catalogues.academic_year')
            ->orderBy('qat_classes.name')
            ->get([
                'qat_classes.id', 'qat_classes.name', 'qat_classes.source_class_id',
                'qat_catalogues.academic_year', 'qat_subjects.id as qat_subject_id',
                'qat_subjects.subject_name', 'qat_subjects.source_pattern_id', 'qat_subjects.subject_id',
            ])
            ->filter(fn ($row) => $user->isSchoolOwner() || AppUserAccess::allowsSubject(
                $access, (int) $row->source_pattern_id, (int) $row->source_class_id, (int) $row->subject_id,
            ));
        $classes = $scopeRows
            ->groupBy('id')
            ->map(fn ($rows) => [
                'id' => $rows->first()->id,
                'name' => $rows->first()->name,
                'academic_year' => $rows->first()->academic_year,
                'subject_count' => $rows->pluck('qat_subject_id')->unique()->count(),
            ])->values();
        $subjectRows = $scopeRows->keyBy('qat_subject_id');
        $chapterRows = DB::table('qat_chapters')
            ->whereIn('qat_subject_id', $subjectRows->keys())
            ->where('status', true)
            ->orderBy('sort_id')->orderBy('id')
            ->get(['id', 'qat_subject_id', 'source_chapter_id', 'name'])
            ->filter(function ($chapter) use ($subjectRows, $user, $access): bool {
                $subject = $subjectRows->get($chapter->qat_subject_id);

                return $subject !== null && ($user->isSchoolOwner() || AppUserAccess::allowsChapter(
                    $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id,
                    (int) $subject->subject_id, (int) $chapter->source_chapter_id,
                ));
            })->values();
        $monthsByChapter = DB::table('qat_chapter_months')
            ->whereIn('qat_chapter_id', $chapterRows->pluck('id'))
            ->get(['qat_chapter_id', 'month'])->groupBy('qat_chapter_id');
        $chapters = $chapterRows->map(fn ($chapter) => [
            'id' => $chapter->id,
            'qat_subject_id' => $chapter->qat_subject_id,
            'name' => $chapter->name,
            'months' => $monthsByChapter->get($chapter->id, collect())->pluck('month')->sort()->values(),
        ])->values();
        $chapterCounts = $chapters->countBy('qat_subject_id');
        $subjects = $scopeRows->map(fn ($row) => [
            'id' => $row->qat_subject_id,
            'qat_class_id' => $row->id,
            'name' => $row->subject_name,
            'class_name' => $row->name,
            'academic_year' => $row->academic_year,
            'chapter_count' => $chapterCounts->get($row->qat_subject_id, 0),
        ])->values();
        $visibleMonthKeys = $chapters->flatMap(fn (array $chapter) => collect($chapter['months'])
            ->map(fn ($month) => $chapter['qat_subject_id'].':'.$month))->flip();
        $monthSyllabi = DB::table('qat_month_syllabi')
            ->whereIn('qat_subject_id', $subjects->pluck('id'))
            ->get(['qat_subject_id', 'month', 'description'])
            ->filter(fn ($syllabus) => $visibleMonthKeys->has($syllabus->qat_subject_id.':'.$syllabus->month))
            ->values();
        $templates = $mode === 'auto'
            ? DB::table('qat_paper_templates')->whereIn('qat_subject_id', $subjects->pluck('id'))
                ->where('status', true)->orderBy('name')
                ->get(['id', 'qat_subject_id', 'name', 'category', 'minutes', 'sections'])
                ->map(function ($template) {
                    $template->sections = json_decode($template->sections, true) ?: [];

                    return $template;
                })
            : collect();

        return Inertia::render('customer/qat/create', [
            'mode' => $mode,
            'initialSelections' => $initialSelections,
            'classes' => $classes,
            'subjects' => $subjects,
            'chapters' => $chapters,
            'monthSyllabi' => $monthSyllabi,
            'templates' => $templates,
        ]);
    }

    private function initialSelections(Request $request, string $mode): ?array
    {
        $data = $request->validate([
            'preview' => ['nullable', 'uuid', 'prohibits:paper'],
            'paper' => ['nullable', 'integer', 'prohibits:preview'],
        ]);
        if (! empty($data['preview'])) {
            $entry = $request->session()->get('qat_preview');
            abort_unless(is_array($entry) && ($entry['id'] ?? null) === $data['preview'], 404);
            abort_unless((int) ($entry['user_id'] ?? 0) === (int) $request->user()->id, 403);
            $paperMode = $entry['papers'][0]['mode'] ?? null;
            $settings = $entry['papers'][0]['paper_data']['generation_settings'] ?? null;
        } elseif (! empty($data['paper'])) {
            $paper = QatPaper::query()->findOrFail($data['paper']);
            abort_unless(in_array((int) $paper->user_id, $this->visibleUserIds($request), true), 403);
            $paperMode = $paper->mode;
            $settings = $paper->paper_data['generation_settings'] ?? null;
        } else {
            return null;
        }

        abort_unless($paperMode === $mode && is_array($settings), 404);

        return $settings;
    }

    private function visibleUserIds(Request $request): array
    {
        $user = $request->user();
        $ids = [(int) $user->id];
        if ($user->isSchoolOwner()) {
            return array_values(array_unique(array_map('intval', [
                ...$ids, ...SchoolTeacherSummary::for($user)['ids'],
            ])));
        }
        if ($user->hasTeacherPermission(TeacherPermission::ViewSchoolPapers->value)) {
            $owner = $user->schoolOwner();
            if ($owner !== null) {
                return array_values(array_unique(array_map('intval', [
                    ...$ids, (int) $owner->id, ...SchoolTeacherSummary::for($user)['ids'],
                ])));
            }
        }

        return $ids;
    }

    public function show(Request $request, int $qatSubject): Response
    {
        $filters = $request->validate([
            'month' => ['nullable', 'integer', 'between:1,12'],
            'chapter' => ['nullable', 'integer'],
            'type' => ['nullable', 'integer'],
            'q' => ['nullable', 'string', 'max:150'],
        ]);
        $subject = DB::table('qat_subjects')
            ->join('qat_classes', 'qat_classes.id', '=', 'qat_subjects.qat_class_id')
            ->join('qat_catalogues', 'qat_catalogues.id', '=', 'qat_classes.qat_catalogue_id')
            ->where('qat_subjects.id', $qatSubject)
            ->where('qat_subjects.status', true)
            ->where('qat_classes.status', true)
            ->first([
                'qat_subjects.id', 'qat_subjects.subject_id', 'qat_subjects.subject_name',
                'qat_subjects.source_pattern_id', 'qat_classes.source_class_id',
                'qat_classes.name as class_name', 'qat_catalogues.academic_year',
            ]);
        abort_unless($subject, 404);

        $access = AppUserAccess::resolve(auth()->user());
        abort_unless(auth()->user()->isSchoolOwner() || AppUserAccess::allowsSubject(
            $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id, (int) $subject->subject_id,
        ), 403);

        $chapterAccess = AppUserAccess::chapterIds(
            $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id, (int) $subject->subject_id,
        );
        $topicAccess = AppUserAccess::topicIds(
            $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id, (int) $subject->subject_id,
        );
        $chapters = DB::table('qat_chapters')->where('qat_subject_id', $qatSubject)->where('status', true)
            ->when($chapterAccess !== null, fn ($query) => $query->whereIn('source_chapter_id', $chapterAccess))
            ->orderBy('sort_id')->orderBy('id')
            ->get(['id', 'name', 'name_ur', 'chapter_number', 'source_chapter_id']);
        $chapterIds = $chapters->pluck('id');
        $monthsByChapter = DB::table('qat_chapter_months')->whereIn('qat_chapter_id', $chapterIds)
            ->get(['qat_chapter_id', 'month'])->groupBy('qat_chapter_id');
        $availableMonths = $monthsByChapter->flatten()->pluck('month')->unique()->sort()->values();
        $month = isset($filters['month']) ? (int) $filters['month'] : null;
        $chapterId = isset($filters['chapter']) ? (int) $filters['chapter'] : null;
        abort_if($chapterId !== null && ! $chapterIds->contains($chapterId), 404);

        $baseQuestions = DB::table('qat_questions as q')
            ->join('qat_chapters as ch', 'ch.id', '=', 'q.qat_chapter_id')
            ->leftJoin('qat_topics as topic', 'topic.id', '=', 'q.qat_topic_id')
            ->where('ch.qat_subject_id', $qatSubject)
            ->where('ch.status', true)->where('q.status', true)
            ->where(function ($query): void {
                $query->whereNull('q.qat_topic_id')->orWhere('topic.status', true);
            })
            ->whereIn('ch.id', $chapterIds)
            ->when($topicAccess !== null, fn ($query) => $query->whereIn('topic.source_topic_id', $topicAccess))
            ->when($month !== null, fn ($query) => $query->whereExists(
                fn ($months) => $months->selectRaw('1')->from('qat_chapter_months as cm')
                    ->whereColumn('cm.qat_chapter_id', 'ch.id')->where('cm.month', $month)
            ));

        if ($month !== null) {
            app(QatPaperBuilder::class)->applyMonthlySelection($baseQuestions, $chapterIds->all(), [$month], 'ch.id', 'q.source_question_id');
        }

        $counts = (clone $baseQuestions)->select('ch.id as chapter_id', 'q.question_type_id')
            ->selectRaw('count(*) as total')->groupBy('ch.id', 'q.question_type_id')->get();
        $chapterCounts = $counts->groupBy('chapter_id');
        $chapters = $chapters->map(function ($chapter) use ($monthsByChapter, $chapterCounts) {
            $chapter->months = $monthsByChapter->get($chapter->id, collect())->pluck('month')->sort()->values();
            $chapter->question_count = $chapterCounts->get($chapter->id, collect())->sum('total');

            return $chapter;
        })->filter(fn ($chapter) => $month === null || $chapter->months->contains($month))->values();
        $types = DB::table('question_types')->whereIn('id', $counts->pluck('question_type_id')->unique())
            ->orderBy('name')->get(['id', 'name']);
        $missingTypeIds = $counts->pluck('question_type_id')->unique()->diff($types->pluck('id'));
        $types = $types->concat($missingTypeIds->map(fn ($id) => (object) [
            'id' => $id, 'name' => 'Type '.$id,
        ]))->sortBy('name')->values();
        $typeCounts = $counts->groupBy('question_type_id')->map(fn ($rows) => $rows->sum('total'));
        $questions = (clone $baseQuestions)
            ->when($chapterId !== null, fn ($query) => $query->where('ch.id', $chapterId))
            ->when(isset($filters['type']), fn ($query) => $query->where('q.question_type_id', (int) $filters['type']))
            ->when(filled($filters['q'] ?? null), fn ($query) => $query->where('q.question_data', 'like', '%'.$filters['q'].'%'))
            ->orderBy('ch.sort_id')->orderBy('q.id')
            ->paginate(25, ['q.id', 'q.question_type_id', 'q.question_data', 'ch.id as chapter_id',
                'ch.name as chapter_name', 'topic.name as topic_name'])
            ->withQueryString();
        $typeNames = $types->pluck('name', 'id');
        $questions->getCollection()->transform(function ($question) use ($typeNames) {
            $data = json_decode($question->question_data, true) ?: [];
            unset($question->question_data);
            $content = (array) ($data['content'] ?? []);
            $question->summary = trim(strip_tags((string) ($data['statement_en'] ?? $data['statement_ur']
                ?? $content['prompt_en'] ?? $content['intro_en'] ?? $content['passage_en'] ?? '')));
            $question->preview_items = collect($content['items'] ?? [])->take(4)
                ->map(fn ($item) => trim(strip_tags((string) ($item['prompt_en'] ?? $item['prompt_ur'] ?? ''))))
                ->filter()->values();
            $question->preview_options = collect($data['options'] ?? $content['options'] ?? [])->take(6)
                ->map(fn ($option) => trim(strip_tags((string) ($option['text_en'] ?? $option['text_ur'] ?? ''))))
                ->filter()->values();
            $question->type_name = $data['question_type']['name'] ?? $typeNames->get($question->question_type_id, 'Question');

            return $question;
        });

        return Inertia::render('customer/qat/subject', [
            'subject' => $subject,
            'chapters' => $chapters,
            'months' => $availableMonths,
            'types' => $types,
            'typeCounts' => $typeCounts,
            'questions' => $questions,
            'filters' => $filters,
            'availableCount' => $counts->sum('total'),
        ]);
    }
}

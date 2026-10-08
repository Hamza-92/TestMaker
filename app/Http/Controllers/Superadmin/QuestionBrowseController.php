<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QuestionBrowseController extends Controller
{
    public function index(): Response
    {
        return $this->browse('patterns', 'Patterns', Pattern::query()->ordered()
            ->get(['id', 'name', 'short_name'])
            ->map(fn (Pattern $pattern) => [
                'id' => $pattern->id,
                'name' => $pattern->name,
                'detail' => $pattern->short_name,
                'href' => route('superadmin.questions.browse.classes', $pattern, false),
            ])->all());
    }

    public function classes(Pattern $pattern): Response
    {
        $classes = SchoolClass::query()
            ->where(function ($query) use ($pattern): void {
                $query->whereIn('id', DB::table('pattern_classes')->select('class_id')->where('pattern_id', $pattern->id))
                    ->orWhereIn('id', Chapter::query()->select('class_id')->where('pattern_id', $pattern->id));
            })
            ->ordered()->get(['id', 'name']);

        return $this->browse('classes', $pattern->name, $classes
            ->map(fn (SchoolClass $class) => [
                'id' => $class->id,
                'name' => $class->name,
                'href' => route('superadmin.questions.browse.subjects', [$pattern, $class], false),
            ])->all(), $this->crumbs($pattern));
    }

    public function subjects(Pattern $pattern, SchoolClass $schoolClass): Response
    {
        $this->ensureClass($pattern, $schoolClass);
        $subjects = Subject::query()
            ->where(function ($query) use ($pattern, $schoolClass): void {
                $query->whereIn('id', ClassSubject::query()->select('subject_id')
                    ->where('pattern_id', $pattern->id)->where('class_id', $schoolClass->id))
                    ->orWhereIn('id', Chapter::query()->select('subject_id')
                        ->where('pattern_id', $pattern->id)->where('class_id', $schoolClass->id));
            })
            ->orderBy('name_eng')->orderBy('id')->get(['id', 'name_eng', 'name_ur']);

        return $this->browse('subjects', $schoolClass->name, $subjects
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name_eng,
                'detail' => $subject->name_ur,
                'href' => route('superadmin.questions.browse.chapters', [$pattern, $schoolClass, $subject], false),
            ])->all(), $this->crumbs($pattern, $schoolClass));
    }

    public function chapters(Pattern $pattern, SchoolClass $schoolClass, Subject $subject): Response
    {
        $this->ensureSubject($pattern, $schoolClass, $subject);
        $chapters = Chapter::query()->where('pattern_id', $pattern->id)
            ->where('class_id', $schoolClass->id)->where('subject_id', $subject->id)
            ->orderBy('group_name')->orderBy('group_heading')->orderBy('sort_id')
            ->orderBy('chapter_number')->orderBy('name')->orderBy('id')
            ->get(['id', 'name', 'name_ur', 'chapter_number', 'group_name']);

        return $this->browse('chapters', $subject->name_eng, $chapters
            ->map(fn (Chapter $chapter) => [
                'id' => $chapter->id,
                'name' => ($chapter->chapter_number ? $chapter->chapter_number.'. ' : '').$chapter->name,
                'detail' => $chapter->name_ur ?: $chapter->group_name,
                'href' => route('superadmin.questions.browse.chapter', [$pattern, $schoolClass, $subject, $chapter], false),
            ])->all(), $this->crumbs($pattern, $schoolClass, $subject));
    }

    public function chapter(Request $request, Pattern $pattern, SchoolClass $schoolClass, Subject $subject, Chapter $chapter): Response
    {
        $this->ensureChapter($pattern, $schoolClass, $subject, $chapter);
        $subjectType = $this->subjectType($pattern, $schoolClass, $subject);
        $topics = $subjectType === 'topic-wise'
            ? Topic::query()->where('chapter_id', $chapter->id)->orderBy('sort_id')
                ->orderBy('name')->orderBy('id')->get(['id', 'name', 'name_ur'])
            : collect();

        if ($topics->isNotEmpty()) {
            $rows = $topics->map(fn (Topic $topic) => [
                'id' => $topic->id,
                'name' => $topic->name,
                'detail' => $topic->name_ur,
                'href' => route('superadmin.questions.browse.topic', [$pattern, $schoolClass, $subject, $chapter, $topic], false),
            ])->all();
            if (Question::query()->where('chapter_id', $chapter->id)->whereNull('topic_id')->exists()) {
                $rows[] = [
                    'id' => 'unassigned',
                    'name' => 'Unassigned questions',
                    'detail' => 'Questions without a topic',
                    'href' => route('superadmin.questions.browse.unassigned', [$pattern, $schoolClass, $subject, $chapter], false),
                ];
            }

            return $this->browse('topics', $chapter->name, $rows,
                $this->crumbs($pattern, $schoolClass, $subject, $chapter));
        }

        return $this->questions($request, $pattern, $schoolClass, $subject, $chapter, null, false);
    }

    public function topic(Request $request, Pattern $pattern, SchoolClass $schoolClass, Subject $subject, Chapter $chapter, Topic $topic): Response
    {
        $this->ensureChapter($pattern, $schoolClass, $subject, $chapter);
        abort_unless($this->subjectType($pattern, $schoolClass, $subject) === 'topic-wise'
            && (int) $topic->chapter_id === (int) $chapter->id, 404);

        return $this->questions($request, $pattern, $schoolClass, $subject, $chapter, $topic);
    }

    public function unassigned(Request $request, Pattern $pattern, SchoolClass $schoolClass, Subject $subject, Chapter $chapter): Response
    {
        $this->ensureChapter($pattern, $schoolClass, $subject, $chapter);
        abort_unless($this->subjectType($pattern, $schoolClass, $subject) === 'topic-wise'
            && Topic::query()->where('chapter_id', $chapter->id)->exists(), 404);

        return $this->questions($request, $pattern, $schoolClass, $subject, $chapter, null, true);
    }

    public function selectionIds(Request $request): JsonResponse
    {
        $scope = $this->validatedListScope($request);
        $query = $this->listScopeQuery($scope);
        $rows = $this->applyListFilters($query, $scope)
            ->orderBy('id')->get(['id', 'question_type_id', 'schema_key']);

        return response()->json(['rows' => $rows]);
    }

    public function sortRows(Request $request): JsonResponse
    {
        $scope = $request->validate([
            'chapter_id' => ['required', 'integer', 'exists:chapters,id'],
            'topic_id' => ['nullable', 'integer', 'exists:topics,id'],
            'question_type_id' => ['required', 'integer', 'exists:question_types,id'],
        ]);
        $chapter = Chapter::query()->findOrFail($scope['chapter_id']);
        if (isset($scope['topic_id'])) {
            abort_unless(Topic::query()->whereKey($scope['topic_id'])->where('chapter_id', $chapter->id)->exists(), 404);
        }

        $rows = Question::query()->where('chapter_id', $chapter->id)
            ->where('question_type_id', $scope['question_type_id'])
            ->when(isset($scope['topic_id']),
                fn ($query) => $query->where('topic_id', $scope['topic_id']),
                fn ($query) => $query->whereNull('topic_id'))
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'statement_en', 'statement_ur', 'content'])
            ->map(function (Question $question): array {
                $content = $question->content ?? [];
                $text = $question->statement_en ?: $question->statement_ur
                    ?: ($content['prompt_en'] ?? $content['prompt_ur'] ?? $content['intro_en'] ?? $content['intro_ur'] ?? '');

                return [
                    'id' => $question->id,
                    'summary_text' => Str::limit(trim(strip_tags((string) $text)) ?: 'Question #'.$question->id, 180),
                ];
            })->values();

        return response()->json(['rows' => $rows]);
    }

    private function questions(Request $request, Pattern $pattern, SchoolClass $schoolClass, Subject $subject, Chapter $chapter, ?Topic $topic, bool $unassigned = false): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'integer', 'min:1'],
            'source' => ['nullable', Rule::in([...Question::sourceValues(), '__blank__'])],
            'status' => ['nullable', Rule::in(['0', '1'])],
            'per_page' => ['nullable', 'integer', Rule::in([25, 50, 100, 200])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $query = Question::query()->where('chapter_id', $chapter->id)
            ->when($topic, fn ($query) => $query->where('topic_id', $topic->id))
            ->when($unassigned, fn ($query) => $query->whereNull('topic_id'));
        $typeIds = (clone $query)->distinct()->pluck('question_type_id');
        $types = QuestionType::query()->whereIn('id', $typeIds)->orderBy('name')->get(['id', 'name']);

        $items = $this->applyListFilters($query, $filters)
            ->with(['questionType', 'options'])
            ->orderBy('question_type_id')->orderBy('topic_id')->orderBy('sort_order')->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 200), ['id', 'chapter_id', 'topic_id', 'question_type_id', 'schema_key', 'statement_en', 'statement_ur', 'content', 'source', 'status', 'sort_order'])
            ->withQueryString();

        $rows = $items->getCollection()->map(function (Question $question): array {
            $type = QuestionTypeSchemaRegistry::typeForQuestion($question, $question->questionType);
            $content = QuestionTypeSchemaRegistry::contentFromQuestion($question, $type);
            $summary = QuestionTypeSchemaRegistry::summarize($type, $content);
            $summary = trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($summary), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');

            return [
                'id' => $question->id,
                'summary_text' => Str::limit($summary ?: 'Question #'.$question->id, 180),
                'question_type' => [
                    'id' => $question->question_type_id,
                    'name' => $question->questionType->name,
                    'schema_key' => $type->schema_key,
                    'is_objective' => (bool) $question->questionType->is_objective,
                ],
                'source' => $question->source,
                'source_label' => Question::sourceLabel($question->source),
                'status' => $question->status,
                'sort_order' => $question->sort_order,
            ];
        })->values();

        return Inertia::render('superadmin/questions/list', [
            'title' => $topic?->name ?? ($unassigned ? 'Unassigned questions' : $chapter->name),
            'breadcrumbs' => $this->crumbs($pattern, $schoolClass, $subject, $chapter, $topic),
            'items' => [
                'data' => $rows,
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
                'from' => $items->firstItem(),
                'to' => $items->lastItem(),
            ],
            'filters' => [
                'q' => $search,
                'type' => (string) ($filters['type'] ?? ''),
                'source' => (string) ($filters['source'] ?? ''),
                'status' => (string) ($filters['status'] ?? ''),
                'per_page' => (string) ($filters['per_page'] ?? 200),
            ],
            'questionTypes' => $types,
            'sourceOptions' => collect(Question::sourceOptions())->map(fn ($label, $value) => ['value' => $value, 'label' => $label])
                ->values()->push(['value' => '__blank__', 'label' => 'No source']),
            'scope' => [
                'chapter_id' => $chapter->id,
                'topic_id' => $topic?->id,
                'unassigned' => $unassigned,
                'subject_type' => $this->subjectType($pattern, $schoolClass, $subject),
            ],
            'addHref' => $topic
                ? route('superadmin.questions.browse.topic.add', [$pattern, $schoolClass, $subject, $chapter, $topic], false)
                : route('superadmin.questions.browse.chapter.add', [$pattern, $schoolClass, $subject, $chapter], false),
            'importHref' => route('superadmin.subjects.chapters.questions.import', [$subject, $chapter], false)
                .($topic ? '?topic_id='.$topic->id : ''),
        ]);
    }

    private function browse(string $level, string $title, array $rows, array $breadcrumbs = []): Response
    {
        return Inertia::render('superadmin/questions/browse', compact('level', 'title', 'rows', 'breadcrumbs'));
    }

    private function validatedListScope(Request $request): array
    {
        return $request->validate([
            'chapter_id' => ['required', 'integer', 'exists:chapters,id'],
            'topic_id' => ['nullable', 'integer', 'exists:topics,id'],
            'unassigned' => ['nullable', 'boolean'],
            'q' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'integer', 'min:1'],
            'source' => ['nullable', Rule::in([...Question::sourceValues(), '__blank__'])],
            'status' => ['nullable', Rule::in(['0', '1'])],
        ]);
    }

    private function listScopeQuery(array $scope)
    {
        $chapter = Chapter::query()->findOrFail($scope['chapter_id']);
        if (isset($scope['topic_id'])) {
            abort_unless(Topic::query()->whereKey($scope['topic_id'])->where('chapter_id', $chapter->id)->exists(), 404);
        }

        return Question::query()->where('chapter_id', $chapter->id)
            ->when(isset($scope['topic_id']), fn ($query) => $query->where('topic_id', $scope['topic_id']))
            ->when($scope['unassigned'] ?? false, fn ($query) => $query->whereNull('topic_id'));
    }

    private function applyListFilters($query, array $filters)
    {
        $search = trim((string) ($filters['q'] ?? ''));

        return $query
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                $query->where('statement_en', 'like', "%{$search}%")
                    ->orWhere('statement_ur', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%")
                    ->orWhereHas('questionType', fn ($typeQuery) => $typeQuery->where('name', 'like', "%{$search}%"));
                if (ctype_digit($search)) {
                    $query->orWhereKey((int) $search);
                }
            }))
            ->when(isset($filters['type']) && $filters['type'] !== '', fn ($query) => $query->where('question_type_id', $filters['type']))
            ->when(isset($filters['source']) && $filters['source'] !== '', fn ($query) => $filters['source'] === '__blank__'
                ? $query->whereNull('source') : $query->where('source', $filters['source']))
            ->when(isset($filters['status']) && $filters['status'] !== '', fn ($query) => $query->where('status', $filters['status']));
    }

    private function crumbs(Pattern $pattern, ?SchoolClass $schoolClass = null, ?Subject $subject = null, ?Chapter $chapter = null, ?Topic $topic = null): array
    {
        $crumbs = [['label' => 'Questions', 'href' => route('superadmin.questions', absolute: false)]];
        $crumbs[] = ['label' => $pattern->name, 'href' => route('superadmin.questions.browse.classes', $pattern, false)];
        if ($schoolClass) {
            $crumbs[] = ['label' => $schoolClass->name, 'href' => route('superadmin.questions.browse.subjects', [$pattern, $schoolClass], false)];
        }
        if ($subject) {
            $crumbs[] = ['label' => $subject->name_eng, 'href' => route('superadmin.questions.browse.chapters', [$pattern, $schoolClass, $subject], false)];
        }
        if ($chapter) {
            $crumbs[] = ['label' => $chapter->name, 'href' => route('superadmin.questions.browse.chapter', [$pattern, $schoolClass, $subject, $chapter], false)];
        }
        if ($topic) {
            $crumbs[] = ['label' => $topic->name, 'href' => route('superadmin.questions.browse.topic', [$pattern, $schoolClass, $subject, $chapter, $topic], false)];
        }

        return $crumbs;
    }

    private function ensureClass(Pattern $pattern, SchoolClass $schoolClass): void
    {
        abort_unless(DB::table('pattern_classes')->where('pattern_id', $pattern->id)->where('class_id', $schoolClass->id)->exists()
            || Chapter::query()->where('pattern_id', $pattern->id)->where('class_id', $schoolClass->id)->exists(), 404);
    }

    private function ensureSubject(Pattern $pattern, SchoolClass $schoolClass, Subject $subject): void
    {
        $this->ensureClass($pattern, $schoolClass);
        abort_unless(ClassSubject::query()->where('pattern_id', $pattern->id)->where('class_id', $schoolClass->id)->where('subject_id', $subject->id)->exists()
            || Chapter::query()->where('pattern_id', $pattern->id)->where('class_id', $schoolClass->id)->where('subject_id', $subject->id)->exists(), 404);
    }

    private function ensureChapter(Pattern $pattern, SchoolClass $schoolClass, Subject $subject, Chapter $chapter): void
    {
        $this->ensureSubject($pattern, $schoolClass, $subject);
        abort_unless((int) $chapter->pattern_id === (int) $pattern->id
            && (int) $chapter->class_id === (int) $schoolClass->id
            && (int) $chapter->subject_id === (int) $subject->id, 404);
    }

    private function subjectType(Pattern $pattern, SchoolClass $schoolClass, Subject $subject): string
    {
        return ClassSubject::subjectTypeForScope($pattern->id, $schoolClass->id, $subject->id, $subject->subject_type);
    }
}

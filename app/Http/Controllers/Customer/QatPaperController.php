<?php

namespace App\Http\Controllers\Customer;

use App\Enums\TeacherPermission;
use App\Http\Controllers\Controller;
use App\Models\QatPaper;
use App\Support\AppUserAccess;
use App\Support\Qat\QatPaperBuilder;
use App\Support\SchoolTeacherSummary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QatPaperController extends Controller
{
    public function questions(Request $request, QatPaperBuilder $builder): JsonResponse
    {
        $data = $request->validate([
            'subject_id' => ['required', 'integer'],
            'syllabus' => ['required', 'in:custom,qat'],
            'chapter_ids' => ['array', 'max:200'],
            'chapter_ids.*' => ['integer', 'distinct'],
            'months' => ['array', 'max:12'],
            'months.*' => ['integer', 'between:1,12', 'distinct'],
            'type_id' => ['nullable', 'integer'],
            'q' => ['nullable', 'string', 'max:150'],
            'include_questions' => ['nullable', 'boolean'],
        ]);
        $this->validateSyllabus($data);
        [$subject, $chapters, $access] = $builder->resolve(
            $request->user(), (int) $data['subject_id'], $data['syllabus'],
            $data['chapter_ids'] ?? [], $data['months'] ?? [],
        );
        $query = $builder->questionQuery($subject, $chapters->pluck('id')->all(), $access);
        $types = (clone $query)
            ->select('question.question_type_id as id', 'type.name', 'type.is_objective')
            ->selectRaw('count(*) as total')
            ->groupBy('question.question_type_id', 'type.name', 'type.is_objective')
            ->orderBy('type.name')->get();
        $questions = ($data['include_questions'] ?? true)
            ? (clone $query)
                ->when(isset($data['type_id']), fn ($query) => $query->where('question.question_type_id', $data['type_id']))
                ->when(filled($data['q'] ?? null), fn ($query) => $query->where('question.question_data', 'like', '%'.$data['q'].'%'))
                ->orderBy('question.id')
                ->get($builder->questionColumns())
                ->map(fn ($question) => $builder->presentQuestion($question))
            : collect();

        return response()->json([
            'types' => $types->map(fn ($type) => [
                'id' => (int) $type->id,
                'name' => $type->name ?: 'Question type '.$type->id,
                'is_objective' => (bool) $type->is_objective,
                'total' => (int) $type->total,
            ]),
            'questions' => [
                'data' => $questions,
                'total' => $questions->count(),
            ],
            'chapters' => $chapters->map(fn ($chapter) => [
                'id' => (int) $chapter->id,
                'name' => $chapter->name,
            ]),
        ]);
    }

    public function store(Request $request, QatPaperBuilder $builder): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'mode' => ['required', 'in:auto,manual'],
            'class_ids' => ['required', 'array', 'min:1', 'max:20'],
            'class_ids.*' => ['required', 'integer', 'distinct'],
            'subject_id' => ['required', 'integer'],
            'syllabus' => ['required', 'in:custom,qat'],
            'chapter_ids' => ['array', 'max:200'],
            'chapter_ids.*' => ['integer', 'distinct'],
            'months' => ['array', 'max:12'],
            'months.*' => ['integer', 'between:1,12', 'distinct'],
            'minutes' => ['required', 'integer', 'between:10,240'],
            'variants' => ['nullable', 'integer', 'between:1,4'],
            'allow_repeat' => ['nullable', 'boolean'],
            'sections' => ['array', 'max:20'],
            'sections.*.question_type_id' => ['required', 'integer', 'distinct'],
            'sections.*.quantity' => ['required', 'integer', 'between:1,100'],
            'sections.*.marks' => ['required', 'numeric', 'between:0.5,20'],
            'manual_questions' => ['array', 'max:100'],
            'manual_questions.*.id' => ['required', 'integer', 'distinct'],
            'manual_questions.*.marks' => ['required', 'numeric', 'between:0.5,20'],
        ]);
        $this->validateSyllabus($data);
        $user = $request->user();
        [$subject, $chapters, $access] = $builder->resolve(
            $user, (int) $data['subject_id'], $data['syllabus'],
            $data['chapter_ids'] ?? [], $data['months'] ?? [],
        );
        $classIds = array_values(array_unique(array_map('intval', $data['class_ids'])));
        if (! in_array((int) $subject->class_id, $classIds, true)) {
            throw ValidationException::withMessages(['class_ids' => 'The paper class must be selected.']);
        }
        $allowedClasses = DB::table('qat_subjects as subject')
            ->join('qat_classes as class', 'class.id', '=', 'subject.qat_class_id')
            ->whereIn('class.id', $classIds)
            ->where('class.status', true)->where('subject.status', true)
            ->get(['class.id', 'class.source_class_id', 'subject.source_pattern_id', 'subject.subject_id'])
            ->filter(fn ($row) => $user->isSchoolOwner() || AppUserAccess::allowsSubject(
                $access, (int) $row->source_pattern_id, (int) $row->source_class_id, (int) $row->subject_id,
            ))->pluck('id')->unique();
        if ($allowedClasses->count() !== count($classIds)) {
            throw ValidationException::withMessages(['class_ids' => 'Some selected classes are unavailable.']);
        }

        $pool = $builder->questionQuery($subject, $chapters->pluck('id')->all(), $access)
            ->get($builder->questionColumns())->keyBy('id');
        $variants = $data['mode'] === 'auto' ? (int) ($data['variants'] ?? 1) : 1;
        $prepared = [];
        if ($data['mode'] === 'auto') {
            $sections = $data['sections'] ?? [];
            if ($sections === [] || collect($sections)->sum('quantity') > 100) {
                throw ValidationException::withMessages(['sections' => 'Choose up to 100 questions across the paper sections.']);
            }
            $used = [];
            foreach (range(1, $variants) as $variant) {
                $paperSections = [];
                foreach ($sections as $section) {
                    $typeId = (int) $section['question_type_id'];
                    $quantity = (int) $section['quantity'];
                    $options = $pool->filter(fn ($row) => (int) $row->question_type_id === $typeId)->shuffle();
                    if (! ($data['allow_repeat'] ?? false)) {
                        $options = $options->reject(fn ($row) => in_array((int) $row->id, $used, true));
                    }
                    $picked = $options->take($quantity);
                    if ($picked->count() !== $quantity) {
                        throw ValidationException::withMessages(['sections' => 'There are not enough eligible questions for every requested paper.']);
                    }
                    $used = [...$used, ...$picked->pluck('id')->map(fn ($id) => (int) $id)->all()];
                    $paperSections[] = [
                        'question_type_id' => $typeId,
                        'title' => $picked->first()->type_name ?: 'Question type '.$typeId,
                        'questions' => $picked->map(fn ($row) => [
                            ...$builder->presentQuestion($row), 'marks' => (float) $section['marks'],
                        ])->values()->all(),
                    ];
                }
                $prepared[] = $paperSections;
            }
        } else {
            $manual = $data['manual_questions'] ?? [];
            if ($manual === []) {
                throw ValidationException::withMessages(['manual_questions' => 'Choose at least one question.']);
            }
            $ids = array_map(fn ($item) => (int) $item['id'], $manual);
            if ($pool->only($ids)->count() !== count($ids)) {
                throw ValidationException::withMessages(['manual_questions' => 'Some selected questions are unavailable.']);
            }
            $prepared[] = collect($manual)->groupBy(fn ($item) => $pool->get($item['id'])->question_type_id)
                ->map(fn ($items, $typeId) => [
                    'question_type_id' => (int) $typeId,
                    'title' => $pool->get($items->first()['id'])->type_name ?: 'Question type '.$typeId,
                    'questions' => $items->map(fn ($item) => [
                        ...$builder->presentQuestion($pool->get($item['id'])),
                        'marks' => (float) $item['marks'],
                    ])->values()->all(),
                ])->values()->all();
        }

        $papers = DB::transaction(function () use ($user, $subject, $data, $classIds, $chapters, $prepared): array {
            $result = [];
            foreach ($prepared as $index => $sections) {
                $name = trim($data['name']).(count($prepared) > 1 ? ' — Paper '.chr(65 + $index) : '');
                $questions = collect($sections)->flatMap(fn ($section) => $section['questions']);
                $result[] = QatPaper::create([
                    'user_id' => $user->id,
                    'name' => $name,
                    'mode' => $data['mode'],
                    'class_ids' => $classIds,
                    'class_names' => $subject->class_name,
                    'subject_name' => $subject->subject_name,
                    'total_marks' => $questions->sum('marks'),
                    'question_count' => $questions->count(),
                    'paper_data' => [
                        'class_id' => (int) $subject->class_id,
                        'subject_id' => (int) $subject->id,
                        'academic_year' => $subject->academic_year,
                        'syllabus' => $data['syllabus'],
                        'months' => $data['syllabus'] === 'qat' ? $data['months'] : [],
                        'chapter_ids' => $chapters->pluck('id')->all(),
                        'minutes' => (int) $data['minutes'],
                        'variant' => count($prepared) > 1 ? chr(65 + $index) : null,
                        'sections' => $sections,
                    ],
                ]);
            }

            return $result;
        });

        return response()->json([
            'paper_id' => $papers[0]->id,
            'paper_ids' => array_map(fn (QatPaper $paper) => $paper->id, $papers),
        ], 201);
    }

    public function show(Request $request, QatPaper $qatPaper): Response
    {
        abort_unless(in_array((int) $qatPaper->user_id, $this->visibleUserIds($request), true), 403);

        return Inertia::render('customer/qat/paper', [
            'paper' => [
                'id' => $qatPaper->id,
                'name' => $qatPaper->name,
                'mode' => $qatPaper->mode,
                'class_name' => $qatPaper->class_names,
                'subject_name' => $qatPaper->subject_name,
                'total_marks' => $qatPaper->total_marks,
                'question_count' => $qatPaper->question_count,
                'created_at' => $qatPaper->created_at?->toISOString(),
                'paper_data' => $qatPaper->paper_data,
            ],
        ]);
    }

    private function validateSyllabus(array $data): void
    {
        if ($data['syllabus'] === 'custom' && empty($data['chapter_ids'])) {
            throw ValidationException::withMessages(['chapter_ids' => 'Select at least one chapter.']);
        }
        if ($data['syllabus'] === 'qat' && empty($data['months'])) {
            throw ValidationException::withMessages(['months' => 'Select at least one QAT month.']);
        }
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
}

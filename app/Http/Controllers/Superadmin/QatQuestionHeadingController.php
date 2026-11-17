<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Support\Qat\QatPaperBuilder;
use App\Support\Qat\QatQuestionTypeRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QatQuestionHeadingController extends Controller
{
    public function index(Request $request): Response
    {
        [$props, $subject] = $this->scope($request);

        return Inertia::render('superadmin/qat-question-headings', [
            ...$props,
            'hiddenTypeIds' => json_decode($subject->hidden_type_headings ?? '[]', true),
        ]);
    }

    public function editText(Request $request, QatPaperBuilder $builder): Response
    {
        [$props, $subject] = $this->scope($request);

        return Inertia::render('superadmin/qat-question-heading-text', [
            ...$props,
            'defaultHeadings' => $subject ? $builder->typeHeadings($subject, $props['types']->pluck('id')->all()) : [],
            'overrides' => json_decode($subject->heading_text_overrides ?? '[]', true),
        ]);
    }

    private function scope(Request $request): array
    {
        $scope = $request->validate([
            'catalogue_id' => ['nullable', 'integer'],
            'class_id' => ['nullable', 'integer'],
            'subject_id' => ['nullable', 'integer'],
        ]);
        $catalogue = (int) ($scope['catalogue_id'] ?? 0);
        $class = (int) ($scope['class_id'] ?? 0);
        $subjects = DB::table('qat_subjects as subject')
            ->join('qat_classes as class', 'class.id', '=', 'subject.qat_class_id')
            ->where('subject.qat_catalogue_id', $catalogue)
            ->where('subject.qat_class_id', $class)->orderBy('subject.subject_name')
            ->get([
                'subject.id', 'subject.subject_name as name', 'subject.hidden_type_headings',
                'subject.heading_text_overrides', 'subject.source_pattern_id', 'subject.subject_id',
                'class.source_class_id',
            ]);
        $subject = $subjects->firstWhere('id', (int) ($scope['subject_id'] ?? 0));

        return [[
            'catalogues' => DB::table('qat_catalogues')->orderByDesc('academic_year')->get(['id', 'academic_year as name']),
            'classes' => DB::table('qat_classes')->where('qat_catalogue_id', $catalogue)->orderBy('name')->get(['id', 'name']),
            'subjects' => $subjects->map(fn ($item) => ['id' => (int) $item->id, 'name' => $item->name]),
            'scope' => ['catalogue_id' => $catalogue, 'class_id' => $class, 'subject_id' => (int) ($subject->id ?? 0)],
            'types' => $subject ? QatQuestionTypeRules::availableTypes($subject->id)->whereNotNull('name')
                ->map(fn ($type) => ['id' => (int) $type->id, 'name' => $type->name])->values() : [],
        ], $subject];
    }

    public function update(Request $request, int $subject): RedirectResponse
    {
        abort_unless(DB::table('qat_subjects')->where('id', $subject)->exists(), 404);
        $data = $request->validate([
            'hidden_type_ids' => ['present', 'array', 'list', 'max:100'],
            'hidden_type_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $ids = array_map('intval', $data['hidden_type_ids']);
        $available = QatQuestionTypeRules::availableTypes($subject)->whereNotNull('name')->pluck('id')->all();
        if (array_diff($ids, $available) !== []) {
            throw ValidationException::withMessages([
                'hidden_type_ids' => 'Choose question types from this QAT subject.',
            ]);
        }

        DB::table('qat_subjects')->where('id', $subject)->update([
            'hidden_type_headings' => json_encode($ids, JSON_THROW_ON_ERROR),
        ]);

        return back()->with('success', 'QAT question headings saved.');
    }

    public function updateText(Request $request, int $subject): RedirectResponse
    {
        abort_unless(DB::table('qat_subjects')->where('id', $subject)->exists(), 404);
        $data = $request->validate([
            'overrides' => ['present', 'array', 'list'],
            'overrides.*' => ['array:question_type_id,heading_en,heading_ur'],
            'overrides.*.question_type_id' => ['required', 'integer', 'distinct'],
            'overrides.*.heading_en' => ['nullable', 'string', 'max:255'],
            'overrides.*.heading_ur' => ['nullable', 'string', 'max:255'],
        ]);
        $available = QatQuestionTypeRules::availableTypes($subject)->whereNotNull('name')->pluck('id')->all();
        $ids = array_column($data['overrides'], 'question_type_id');
        if (array_diff($ids, $available) !== []) {
            throw ValidationException::withMessages([
                'overrides' => 'Choose question types from this QAT subject.',
            ]);
        }

        $overrides = [];
        foreach ($data['overrides'] as $row) {
            $headings = array_filter([
                'heading_en' => trim($row['heading_en'] ?? ''),
                'heading_ur' => trim($row['heading_ur'] ?? ''),
            ], fn (string $heading) => $heading !== '');
            if ($headings !== []) {
                $overrides[(int) $row['question_type_id']] = $headings;
            }
        }

        DB::table('qat_subjects')->where('id', $subject)->update([
            'heading_text_overrides' => $overrides === [] ? null : json_encode($overrides, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
        ]);

        return back()->with('success', 'QAT heading text saved.');
    }
}

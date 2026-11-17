<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
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
        $scope = $request->validate([
            'catalogue_id' => ['nullable', 'integer'],
            'class_id' => ['nullable', 'integer'],
            'subject_id' => ['nullable', 'integer'],
        ]);
        $catalogue = (int) ($scope['catalogue_id'] ?? 0);
        $class = (int) ($scope['class_id'] ?? 0);
        $subjects = DB::table('qat_subjects')->where('qat_catalogue_id', $catalogue)
            ->where('qat_class_id', $class)->orderBy('subject_name')
            ->get(['id', 'subject_name as name', 'hidden_type_headings']);
        $subject = $subjects->firstWhere('id', (int) ($scope['subject_id'] ?? 0));

        return Inertia::render('superadmin/qat-question-headings', [
            'catalogues' => DB::table('qat_catalogues')->orderByDesc('academic_year')->get(['id', 'academic_year as name']),
            'classes' => DB::table('qat_classes')->where('qat_catalogue_id', $catalogue)->orderBy('name')->get(['id', 'name']),
            'subjects' => $subjects->map(fn ($item) => ['id' => (int) $item->id, 'name' => $item->name]),
            'scope' => ['catalogue_id' => $catalogue, 'class_id' => $class, 'subject_id' => (int) ($subject->id ?? 0)],
            'types' => $subject ? QatQuestionTypeRules::availableTypes($subject->id)->whereNotNull('name')
                ->map(fn ($type) => ['id' => (int) $type->id, 'name' => $type->name])->values() : [],
            'hiddenTypeIds' => json_decode($subject->hidden_type_headings ?? '[]', true),
        ]);
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
}

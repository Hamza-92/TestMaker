<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\MultipartQuestionSetting;
use App\Models\Pattern;
use App\Models\QuestionType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MultipartQuestionSettingController extends Controller
{
    public function index(Request $request)
    {
        $scope = $this->requestedScope($request);

        return Inertia::render('superadmin/multipart-question-settings', [
            'scopeCatalog' => $this->scopeCatalog(),
            'selectedScope' => $scope === null ? null : [
                'pattern_id' => $scope[0],
                'class_id' => $scope[1],
                'subject_id' => $scope[2],
            ],
            'questionTypes' => $scope === null ? [] : $this->questionTypeOptions(...$scope),
            'setting' => $scope === null ? null : $this->setting(...$scope),
        ]);
    }

    public function store(Request $request)
    {
        return $this->save($request);
    }

    public function update(Request $request, MultipartQuestionSetting $setting)
    {
        $request->merge([
            'pattern_id' => $setting->pattern_id,
            'class_id' => $setting->class_id,
            'subject_id' => $setting->subject_id,
        ]);

        return $this->save($request, $setting);
    }

    public function destroy(MultipartQuestionSetting $setting)
    {
        AuditLog::record(
            model: $setting,
            event: AuditEvent::Deleted,
            oldValues: $this->auditValues($setting),
            notes: 'Multipart question setting removed.',
        );

        $setting->delete();

        return back()->with('success', 'Multipart setting removed.');
    }

    private function save(Request $request, ?MultipartQuestionSetting $existing = null)
    {
        $validated = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'is_active' => ['required', 'boolean'],
            'max_parts' => ['required', 'integer', 'min:2', 'max:5'],
            'choice_count' => ['required', 'integer', 'min:1', 'max:5'],
            'heading_en' => ['nullable', 'string', 'max:255'],
            'heading_ur' => ['nullable', 'string', 'max:1000'],
            'part_type_ids' => ['required', 'array', 'min:2', 'max:5'],
            'part_type_ids.*' => ['required', 'integer', 'distinct', 'exists:question_types,id'],
        ]);

        $patternId = (int) $validated['pattern_id'];
        $classId = (int) $validated['class_id'];
        $subjectId = (int) $validated['subject_id'];
        $maxParts = (int) $validated['max_parts'];
        $choiceCount = (int) $validated['choice_count'];
        $partTypeIds = array_values(array_unique(array_map('intval', $validated['part_type_ids'])));

        $this->validateScope($patternId, $classId, $subjectId);

        if (count($partTypeIds) > $maxParts) {
            throw ValidationException::withMessages([
                'part_type_ids' => 'The number of enabled types cannot exceed the maximum parts.',
            ]);
        }

        if ($choiceCount > count($partTypeIds)) {
            throw ValidationException::withMessages([
                'choice_count' => 'Choice count cannot exceed the number of enabled part types.',
            ]);
        }

        $availableIds = $this->scopedQuestionTypeQuery($patternId, $classId, $subjectId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id);
        if (collect($partTypeIds)->contains(fn (int $id) => ! $availableIds->contains($id))) {
            throw ValidationException::withMessages([
                'part_type_ids' => 'Every enabled type must be a subjective type available in this scope.',
            ]);
        }

        $setting = $existing ?? MultipartQuestionSetting::query()->firstOrNew([
            'pattern_id' => $patternId,
            'class_id' => $classId,
            'subject_id' => $subjectId,
        ]);
        $oldValues = $setting->exists ? $this->auditValues($setting) : null;
        $setting->fill([
            'pattern_id' => $patternId,
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'is_active' => (bool) $validated['is_active'],
            'max_parts' => $maxParts,
            'choice_count' => $choiceCount,
            'heading_en' => trim((string) ($validated['heading_en'] ?? '')) ?: null,
            'heading_ur' => trim((string) ($validated['heading_ur'] ?? '')) ?: null,
            'part_type_ids' => $partTypeIds,
            'created_by' => $setting->created_by ?? $request->user()?->id,
        ]);
        $setting->save();

        AuditLog::record(
            model: $setting,
            event: $oldValues === null ? AuditEvent::Created : AuditEvent::Updated,
            oldValues: $oldValues,
            newValues: $this->auditValues($setting),
            notes: 'Multipart question setting saved.',
        );

        return back()->with('success', 'Multipart setting saved successfully.');
    }

    private function setting(int $patternId, int $classId, int $subjectId): ?array
    {
        $setting = MultipartQuestionSetting::query()
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->first();

        if ($setting === null) {
            return null;
        }

        return [
            'id' => $setting->id,
            'is_active' => (bool) $setting->is_active,
            'max_parts' => (int) $setting->max_parts,
            'choice_count' => (int) $setting->choice_count,
            'heading_en' => $setting->heading_en,
            'heading_ur' => $setting->heading_ur,
            'part_type_ids' => collect($setting->part_type_ids ?? [])->map(fn ($id) => (int) $id)->values()->all(),
        ];
    }

    private function scopeCatalog(): array
    {
        return [
            'patterns' => Pattern::query()->where('status', 1)->ordered()->get(['id', 'name', 'short_name']),
            'patternClasses' => DB::table('pattern_classes')
                ->join('patterns', 'patterns.id', '=', 'pattern_classes.pattern_id')
                ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                ->where('patterns.status', 1)->where('classes.status', 1)
                ->orderBy('patterns.sort_order')->orderBy('patterns.id')->orderBy('classes.sort_order')->orderBy('classes.id')
                ->get(['pattern_classes.pattern_id', 'classes.id', 'classes.name']),
            'classSubjects' => DB::table('class_subjects')
                ->join('patterns', 'patterns.id', '=', 'class_subjects.pattern_id')
                ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                ->where('patterns.status', 1)->where('subjects.status', 1)
                ->orderBy('patterns.sort_order')->orderBy('patterns.id')->orderBy('subjects.name_eng')
                ->get(['class_subjects.pattern_id', 'class_subjects.class_id', 'class_subjects.subject_id', 'subjects.name_eng as name']),
        ];
    }

    private function questionTypeOptions(int $patternId, int $classId, int $subjectId): array
    {
        return $this->scopedQuestionTypeQuery($patternId, $classId, $subjectId)
            ->orderBy('name')->get(['id', 'name', 'name_ur', 'heading_en', 'heading_ur'])
            ->map(fn (QuestionType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'name_ur' => $type->name_ur,
                'heading_en' => $type->heading_en,
                'heading_ur' => $type->heading_ur,
            ])->values()->all();
    }

    private function scopedQuestionTypeQuery(int $patternId, int $classId, int $subjectId): Builder
    {
        return QuestionType::query()
            ->where('is_objective', false)->where('status', 1)
            ->whereIn('question_types.id', DB::table('questions')
                ->join('chapters', 'chapters.id', '=', 'questions.chapter_id')
                ->where('questions.status', 1)->where('chapters.pattern_id', $patternId)
                ->where('chapters.class_id', $classId)->where('chapters.subject_id', $subjectId)
                ->select('questions.question_type_id'));
    }

    private function requestedScope(Request $request): ?array
    {
        $scope = [(int) $request->query('pattern_id', 0), (int) $request->query('class_id', 0), (int) $request->query('subject_id', 0)];

        return min($scope) < 1 || ! $this->scopeExists(...$scope) ? null : $scope;
    }

    private function validateScope(int $patternId, int $classId, int $subjectId): void
    {
        if (! $this->scopeExists($patternId, $classId, $subjectId)) {
            throw ValidationException::withMessages(['subject_id' => 'The selected pattern, class, and subject are not linked.']);
        }
    }

    private function scopeExists(int $patternId, int $classId, int $subjectId): bool
    {
        return DB::table('class_subjects')->where('pattern_id', $patternId)->where('class_id', $classId)->where('subject_id', $subjectId)->exists();
    }

    private function auditValues(MultipartQuestionSetting $setting): array
    {
        return [
            'pattern_id' => $setting->pattern_id,
            'class_id' => $setting->class_id,
            'subject_id' => $setting->subject_id,
            'is_active' => (bool) $setting->is_active,
            'max_parts' => (int) $setting->max_parts,
            'choice_count' => (int) $setting->choice_count,
            'part_type_ids' => $setting->part_type_ids ?? [],
        ];
    }
}

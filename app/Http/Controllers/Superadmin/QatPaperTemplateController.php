<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QatPaperTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
        ]);
        $templates = DB::table('qat_paper_templates as template')
            ->join('qat_subjects as subject', 'subject.id', '=', 'template.qat_subject_id')
            ->join('qat_classes as class', 'class.id', '=', 'subject.qat_class_id')
            ->join('qat_catalogues as catalogue', 'catalogue.id', '=', 'class.qat_catalogue_id')
            ->select('template.*', 'subject.subject_name', 'class.name as class_name', 'catalogue.academic_year')
            ->when($filters['q'] ?? null, fn ($query, $q) => $query->where(function ($query) use ($q): void {
                $query->where('template.name', 'like', '%'.$q.'%')
                    ->orWhere('subject.subject_name', 'like', '%'.$q.'%')
                    ->orWhere('class.name', 'like', '%'.$q.'%');
            }))
            ->when(($filters['status'] ?? 'all') !== 'all', fn ($query) => $query->where('template.status', $filters['status'] === 'active'))
            ->orderByDesc('catalogue.academic_year')->orderBy('class.name')->orderBy('subject.subject_name')
            ->orderBy('template.name')->paginate(20)->withQueryString();
        $templates->getCollection()->transform(function ($template) {
            $template->sections = json_decode($template->sections, true) ?: [];

            return $template;
        });

        $subjects = DB::table('qat_subjects as subject')
            ->join('qat_classes as class', 'class.id', '=', 'subject.qat_class_id')
            ->join('qat_catalogues as catalogue', 'catalogue.id', '=', 'class.qat_catalogue_id')
            ->orderByDesc('catalogue.academic_year')->orderBy('class.name')->orderBy('subject.subject_name')
            ->get(['subject.id', 'subject.subject_name', 'subject.status', 'class.name as class_name',
                'class.status as class_status', 'catalogue.academic_year']);
        $types = DB::table('qat_questions as question')
            ->join('qat_chapters as chapter', 'chapter.id', '=', 'question.qat_chapter_id')
            ->join('question_types as type', 'type.id', '=', 'question.question_type_id')
            ->where('question.status', true)->where('chapter.status', true)->where('type.status', true)
            ->select('chapter.qat_subject_id', 'type.id', 'type.name', 'type.is_objective')
            ->distinct()->orderBy('type.is_objective', 'desc')->orderBy('type.name')->get();

        return Inertia::render('superadmin/qat-templates', [
            'templates' => $templates,
            'subjects' => $subjects,
            'types' => $types,
            'filters' => $filters,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        DB::table('qat_paper_templates')->insert([
            ...$data,
            'sections' => json_encode($data['sections']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'QAT template created.');
    }

    public function update(Request $request, int $template): RedirectResponse
    {
        abort_unless(DB::table('qat_paper_templates')->where('id', $template)->exists(), 404);
        $data = $this->validated($request);
        DB::table('qat_paper_templates')->where('id', $template)->update([
            ...$data,
            'sections' => json_encode($data['sections']),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'QAT template updated.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'qat_subject_id' => ['required', 'integer', 'exists:qat_subjects,id'],
            'name' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:80'],
            'minutes' => ['required', 'integer', 'between:10,240'],
            'status' => ['required', 'boolean'],
            'sections' => ['required', 'array', 'min:1', 'max:20'],
            'sections.*.question_type_id' => ['required', 'integer', 'distinct'],
            'sections.*.quantity' => ['required', 'integer', 'between:1,100'],
            'sections.*.required_questions' => ['sometimes', 'required', 'integer', 'between:1,100'],
            'sections.*.marks' => ['required', 'numeric', 'between:0.5,20'],
        ]);
        foreach ($data['sections'] as $index => &$section) {
            $section['required_questions'] ??= $section['quantity'];
            if ($section['required_questions'] > $section['quantity']) {
                throw ValidationException::withMessages([
                    "sections.$index.required_questions" => 'Required questions cannot exceed total questions.',
                ]);
            }
        }
        unset($section);
        $subject = DB::table('qat_subjects as subject')
            ->join('qat_classes as class', 'class.id', '=', 'subject.qat_class_id')
            ->where('subject.id', $data['qat_subject_id'])
            ->where('subject.status', true)->where('class.status', true)->exists();
        if (! $subject) {
            throw ValidationException::withMessages(['qat_subject_id' => 'Select an active QAT book.']);
        }
        if (collect($data['sections'])->sum('quantity') > 100) {
            throw ValidationException::withMessages(['sections' => 'A template can contain at most 100 questions.']);
        }
        $typeIds = collect($data['sections'])->pluck('question_type_id')->map(fn ($id) => (int) $id);
        $available = DB::table('qat_questions as question')
            ->join('qat_chapters as chapter', 'chapter.id', '=', 'question.qat_chapter_id')
            ->join('question_types as type', 'type.id', '=', 'question.question_type_id')
            ->where('chapter.qat_subject_id', $data['qat_subject_id'])
            ->where('question.status', true)->where('chapter.status', true)->where('type.status', true)
            ->whereIn('type.id', $typeIds)->distinct()->pluck('type.id');
        if ($available->count() !== $typeIds->count()) {
            throw ValidationException::withMessages(['sections' => 'Choose question types available in this QAT book.']);
        }

        return $data;
    }
}

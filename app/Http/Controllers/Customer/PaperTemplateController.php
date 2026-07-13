<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\PaperTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaperTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('q', ''));

        $templates = PaperTemplate::query()
            ->where('user_id', $user->id)
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'description', 'structure', 'updated_at'])
            ->map(fn (PaperTemplate $template) => [
                'id'            => $template->id,
                'name'          => $template->name,
                'description'   => $template->description,
                'section_count' => is_array($template->structure['sections'] ?? null)
                    ? count($template->structure['sections'])
                    : 0,
                'total_marks'   => (int) ($template->structure['total_marks'] ?? 0),
                'updated_at'    => $template->updated_at?->toISOString(),
            ]);

        return Inertia::render('customer/templates/index', [
            'templates' => $templates,
            'filters'   => ['q' => $search],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                       => ['required', 'string', 'max:255'],
            'description'                => ['nullable', 'string', 'max:500'],
            'settings'                   => ['required', 'array'],
            'structure'                  => ['required', 'array'],
            'structure.sections'         => ['required', 'array'],
            'structure.sections.*.questionTypeId' => ['nullable', 'integer'],
            'structure.sections.*.category'       => ['required', 'string', 'max:60'],
            'structure.sections.*.title'          => ['required', 'string', 'max:200'],
            'structure.sections.*.requiredQuestions' => ['required', 'integer', 'min:0'],
            'structure.sections.*.totalQuestions'    => ['required', 'integer', 'min:0'],
            'structure.sections.*.marksEach'         => ['required', 'integer', 'min:0'],
            'structure.sections.*.columns'           => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        $data['structure']['total_marks'] = collect($data['structure']['sections'])
            ->sum(fn ($section) => (int) $section['requiredQuestions'] * (int) $section['marksEach']);

        $template = PaperTemplate::create([
            'user_id'     => $request->user()->id,
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'settings'    => $data['settings'],
            'structure'   => $data['structure'],
        ]);

        return response()->json([
            'id'   => $template->id,
            'name' => $template->name,
        ], 201);
    }

    public function update(Request $request, PaperTemplate $template): RedirectResponse
    {
        abort_if($template->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $template->update($data);

        return redirect()->route('customer.templates.index')
            ->with('success', 'Template updated.');
    }

    public function destroy(Request $request, PaperTemplate $template): RedirectResponse
    {
        abort_if($template->user_id !== $request->user()->id, 403);

        $template->delete();

        return redirect()->route('customer.templates.index')
            ->with('success', 'Template deleted.');
    }
}

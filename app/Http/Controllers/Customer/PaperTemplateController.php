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
    /** Divisible by 2 and 3, so the grid never ends in a ragged row. */
    private const PER_PAGE = 12;

    /** Upper bound on a bulk request, so one call cannot wipe a library. */
    private const MAX_BULK = 200;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('q', ''));

        $map = fn (PaperTemplate $template) => [
            'id'            => $template->id,
            'name'          => $template->name,
            'description'   => $template->description,
            'section_count' => is_array($template->structure['sections'] ?? null)
                ? count($template->structure['sections'])
                : 0,
            'total_marks'   => (int) ($template->structure['total_marks'] ?? 0),
            'updated_at'    => $template->updated_at?->toISOString(),
        ];

        $items = PaperTemplate::query()
            ->where('user_id', $user->id)
            // Descriptions are searched too — they are shown on the card, so
            // not matching them reads as the search being broken.
            ->when($search !== '', fn ($q) => $q->where(function ($qq) use ($search) {
                $qq->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            }))
            ->orderByDesc('updated_at')
            ->paginate(self::PER_PAGE, ['id', 'name', 'description', 'structure', 'updated_at'])
            ->withQueryString();

        return Inertia::render('customer/templates/index', [
            'items' => [
                'data'         => collect($items->items())->map($map)->values(),
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
                'from'         => $items->firstItem(),
                'to'           => $items->lastItem(),
            ],
            // Unfiltered total, so the header count does not move as you search.
            'totalCount' => PaperTemplate::where('user_id', $user->id)->count(),
            'filters'    => ['q' => $search],
        ]);
    }

    public function duplicate(Request $request, PaperTemplate $template): JsonResponse
    {
        abort_if($template->user_id !== $request->user()->id, 403);

        $copy = $template->replicate(['created_at', 'updated_at']);
        $copy->user_id = $request->user()->id;
        $copy->name = $this->buildCopyName($template->name, $request->user()->id);
        $copy->save();

        return response()->json(['id' => $copy->id, 'name' => $copy->name], 201);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1', 'max:' . self::MAX_BULK],
            'ids.*' => ['integer'],
        ]);

        // Re-scoped to the owner: the UI only offers the user's own
        // templates, but the server must not trust that.
        $deleted = PaperTemplate::whereIn('id', $data['ids'])
            ->where('user_id', $request->user()->id)
            ->get();

        foreach ($deleted as $template) {
            $template->delete();
        }

        return response()->json(['deleted' => $deleted->count()]);
    }

    private function buildCopyName(string $name, int $userId): string
    {
        $base = preg_replace('/\s*\(Copy(?:\s+\d+)?\)\s*$/i', '', $name);
        $candidate = "{$base} (Copy)";

        if (! PaperTemplate::where('user_id', $userId)->where('name', $candidate)->exists()) {
            return $candidate;
        }

        $n = 2;
        while (PaperTemplate::where('user_id', $userId)->where('name', "{$base} (Copy {$n})")->exists()) {
            $n++;
        }

        return "{$base} (Copy {$n})";
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
            'structure.sections.*.orPairingId'        => ['nullable', 'integer'],
            'structure.sections.*.orQuestionTypeId'   => ['nullable', 'integer'],
            'structure.sections.*.orRole'             => ['nullable', Rule::in(['primary', 'alternative'])],
        ]);

        $data['structure']['total_marks'] = collect($data['structure']['sections'])
            ->reject(fn ($section) => ($section['orRole'] ?? null) === 'alternative')
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

        // Key must be `toast`: that is what HandleInertiaRequests shares and
        // useFlashToast reads. A `success` key is read by nothing.
        return redirect()->route('customer.templates.index')
            ->with('toast', ['type' => 'success', 'message' => 'Template updated']);
    }

    public function destroy(Request $request, PaperTemplate $template): RedirectResponse
    {
        abort_if($template->user_id !== $request->user()->id, 403);

        $template->delete();

        return redirect()->route('customer.templates.index')
            ->with('toast', ['type' => 'success', 'message' => 'Template deleted']);
    }
}

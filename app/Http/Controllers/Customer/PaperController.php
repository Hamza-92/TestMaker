<?php

namespace App\Http\Controllers\Customer;

use App\Enums\TeacherPermission;
use App\Http\Controllers\Controller;
use App\Models\Paper;
use App\Models\PaperFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaperController extends Controller
{
    private const PER_PAGE = 25;

    /** Upper bound on a single bulk request, so one call cannot delete a whole library. */
    private const MAX_BULK = 200;

    public function index(Request $request): Response
    {
        $cols = ['id', 'name', 'subject', 'class_name', 'total_marks', 'user_id', 'folder_id', 'created_at', 'updated_at'];
        $user = auth()->user();
        $userIds = $this->visibleUserIds($user);
        $search = trim((string) $request->query('q', ''));
        $folderParam = $request->query('folder');
        $folderFilter = $folderParam === null || $folderParam === '' ? null : $folderParam;
        $map  = fn (Paper $paper) => [
            'id'          => $paper->id,
            'name'        => $paper->name,
            'subject'     => $paper->subject,
            'class_name'  => $paper->class_name,
            'total_marks' => $paper->total_marks,
            'folder_id'   => $paper->folder_id,
            'created_at'  => $paper->created_at->toISOString(),
            'updated_at'  => $paper->updated_at->toISOString(),
            'author_name' => $paper->relationLoaded('user') ? $paper->user?->name : null,
            'is_mine'     => (int) $paper->user_id === (int) $user->id,
        ];

        $base = Paper::query()
            ->whereIn('user_id', $userIds)
            ->with('user:id,name')
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('name', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%")
                        ->orWhere('class_name', 'like', "%{$search}%");
                });
            })
            ->when($folderFilter === 'unfiled', fn ($q) => $q->whereNull('folder_id'))
            ->when(is_numeric($folderFilter), fn ($q) => $q->where('folder_id', (int) $folderFilter))
            ->orderByDesc('updated_at');

        $folders = PaperFolder::where('user_id', $user->id)
            ->orderBy('name')
            ->withCount(['papers as papers_count' => fn ($q) => $q->whereIn('user_id', $userIds)])
            ->get(['id', 'name', 'color'])
            ->map(fn (PaperFolder $folder) => [
                'id'           => $folder->id,
                'name'         => $folder->name,
                'color'        => $folder->color,
                'papers_count' => (int) ($folder->papers_count ?? 0),
            ]);

        // Only the active tab's rows are fetched. The other tab needs just a
        // number for its badge, so it costs a COUNT instead of a full result
        // set — before this, every paper AND every draft was serialised into
        // the payload on each load and on each debounced search keystroke.
        $tab = $request->query('tab') === 'drafts' ? 'drafts' : 'papers';

        $papersCount = (clone $base)->where('is_draft', false)->count();
        $draftsCount = (clone $base)->where('is_draft', true)->count();

        $items = (clone $base)
            ->where('is_draft', $tab === 'drafts')
            ->paginate(self::PER_PAGE, $cols)
            ->withQueryString();

        // Sidebar totals ignore the current folder and search, exactly like
        // the per-folder counts above — they are navigation targets, so they
        // must not change as you filter. They used to be derived from the
        // full client-side list, which no longer exists.
        $allScope = Paper::query()->whereIn('user_id', $userIds);
        $sidebar = [
            'all'     => (clone $allScope)->count(),
            'unfiled' => (clone $allScope)->whereNull('folder_id')->count(),
        ];

        return Inertia::render('customer/papers/index', [
            'items' => [
                'data'         => collect($items->items())->map($map)->values(),
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
                'from'         => $items->firstItem(),
                'to'           => $items->lastItem(),
            ],
            'counts'  => ['papers' => $papersCount, 'drafts' => $draftsCount],
            'sidebar' => $sidebar,
            'folders' => $folders,
            'filters' => ['q' => $search, 'folder' => $folderFilter, 'tab' => $tab],
        ]);
    }

    /**
     * Restrict a set of submitted ids to papers the current user actually
     * owns. Teachers can *see* colleagues' papers but must not be able to
     * delete, move or duplicate them via a hand-crafted request.
     */
    private function ownedPapers(Request $request): \Illuminate\Support\Collection
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1', 'max:' . self::MAX_BULK],
            'ids.*' => ['integer'],
        ]);

        return Paper::whereIn('id', $data['ids'])
            ->where('user_id', auth()->id())
            ->get();
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $papers = $this->ownedPapers($request);

        foreach ($papers as $paper) {
            $paper->delete();
        }

        return response()->json(['deleted' => $papers->count()]);
    }

    public function bulkMove(Request $request): JsonResponse
    {
        $request->validate([
            'folder_id' => ['nullable', 'integer', Rule::exists('paper_folders', 'id')->where('user_id', auth()->id())],
        ]);

        $folderId = $request->input('folder_id') ?: null;
        $papers = $this->ownedPapers($request);

        foreach ($papers as $paper) {
            $paper->folder_id = $folderId;
            $paper->save();
        }

        return response()->json(['moved' => $papers->count()]);
    }

    public function bulkDuplicate(Request $request): JsonResponse
    {
        $papers = $this->ownedPapers($request);
        $created = 0;

        foreach ($papers as $paper) {
            $copy = $paper->replicate(['created_at', 'updated_at']);
            $copy->user_id = auth()->id();
            $copy->name = $this->buildCopyName($paper->name);
            $copy->is_draft = false;
            $copy->save();
            $created++;
        }

        return response()->json(['duplicated' => $created]);
    }

    public function move(Request $request, Paper $paper): JsonResponse
    {
        abort_if($paper->user_id !== auth()->id(), 403);

        $data = $request->validate([
            'folder_id' => ['nullable', 'integer', Rule::exists('paper_folders', 'id')->where('user_id', auth()->id())],
        ]);

        $paper->folder_id = $data['folder_id'] ?? null;
        $paper->save();

        return response()->json(['folder_id' => $paper->folder_id]);
    }

    public function duplicate(Paper $paper): JsonResponse
    {
        abort_unless($this->canView($paper), 403);

        $copy = $paper->replicate(['created_at', 'updated_at']);
        $copy->user_id = auth()->id();
        $copy->name = $this->buildCopyName($paper->name);
        $copy->is_draft = false;
        $copy->save();

        return response()->json([
            'id'   => $copy->id,
            'name' => $copy->name,
        ], 201);
    }

    private function canView(Paper $paper): bool
    {
        $user = auth()->user();

        return in_array((int) $paper->user_id, $this->visibleUserIds($user), true);
    }

    private function buildCopyName(string $name): string
    {
        $base = preg_replace('/\s*\(Copy(?:\s+\d+)?\)\s*$/i', '', $name);
        $candidate = "{$base} (Copy)";

        if (! Paper::where('user_id', auth()->id())->where('name', $candidate)->exists()) {
            return $candidate;
        }

        $n = 2;
        while (Paper::where('user_id', auth()->id())->where('name', "{$base} (Copy {$n})")->exists()) {
            $n++;
        }

        return "{$base} (Copy {$n})";
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'subject'     => 'nullable|string|max:150',
            'class_name'  => 'nullable|string|max:150',
            'total_marks' => 'required|integer|min:0',
            'paper_data'  => 'required|array',
            'is_draft'    => 'boolean',
        ]);

        $paper = auth()->user()->papers()->create($data);

        return response()->json([
            'id'         => $paper->id,
            'name'       => $paper->name,
            'updated_at' => $paper->updated_at->toISOString(),
        ], 201);
    }

    public function update(Request $request, Paper $paper): JsonResponse
    {
        abort_if($paper->user_id !== auth()->id(), 403);

        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'subject'     => 'nullable|string|max:150',
            'class_name'  => 'nullable|string|max:150',
            'total_marks' => 'required|integer|min:0',
            'paper_data'  => 'required|array',
            'is_draft'    => 'boolean',
        ]);

        $paper->update($data);

        return response()->json([
            'updated_at' => $paper->fresh()->updated_at->toISOString(),
        ]);
    }

    /**
     * Returns JSON, like every other write method here.
     *
     * This used to redirect to the index. Its only caller is a `fetch` from
     * the papers page, so the browser silently followed that redirect and
     * rendered the whole index server-side — after which the client called
     * router.reload() and rendered it a second time. Two full renders per
     * delete, and the response the client ended up inspecting was the
     * followed page rather than the delete itself.
     */
    public function destroy(Paper $paper): JsonResponse
    {
        abort_if($paper->user_id !== auth()->id(), 403);

        $paper->delete();

        return response()->json(['deleted' => true]);
    }

    public function edit(Paper $paper): Response
    {
        abort_if($paper->user_id !== auth()->id(), 403);

        $paperData = $paper->paper_data;

        $savedPaper = [
            'id'                  => $paper->id,
            'name'                => $paper->name,
            'is_draft'            => $paper->is_draft,
            'paper'               => $paperData['paper'] ?? null,
            'questionPoolsByType' => $paperData['questionPoolsByType'] ?? [],
            'questionSelection'   => $paperData['questionSelection'] ?? null,
            'chapterSelection'    => $paperData['chapterSelection'] ?? null,
            'meta'                => $paperData['meta'] ?? null,
        ];

        return Inertia::render('customer/papers/generate', array_merge(
            GeneratePaperController::pageData(),
            ['savedPaper' => $savedPaper]
        ));
    }

    private function visibleUserIds($user): array
    {
        $ids = [$user->id];

        if ($user->isSchoolOwner()) {
            $ids = array_values(array_unique([
                ...$ids,
                ...$user->teachers()->pluck('id')->all(),
            ]));

            return $ids;
        }

        if ($user->isTeacher() && $user->hasTeacherPermission(TeacherPermission::ViewSchoolPapers->value)) {
            $owner = $user->schoolOwner();

            if ($owner !== null) {
                $ids = array_values(array_unique([
                    ...$ids,
                    $owner->id,
                    ...$owner->teachers()->pluck('id')->all(),
                ]));
            }
        }

        return $ids;
    }
}

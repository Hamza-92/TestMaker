<?php

namespace App\Http\Controllers\Customer;

use App\Enums\TeacherPermission;
use App\Http\Controllers\Controller;
use App\Models\Paper;
use App\Models\PaperFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaperController extends Controller
{
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

        return Inertia::render('customer/papers/index', [
            'papers'  => (clone $base)->where('is_draft', false)->get($cols)->map($map),
            'drafts'  => (clone $base)->where('is_draft', true)->get($cols)->map($map),
            'folders' => $folders,
            'filters' => ['q' => $search, 'folder' => $folderFilter],
        ]);
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

    public function destroy(Paper $paper): RedirectResponse
    {
        abort_if($paper->user_id !== auth()->id(), 403);

        $paper->delete();

        return redirect()->route('customer.papers.index');
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

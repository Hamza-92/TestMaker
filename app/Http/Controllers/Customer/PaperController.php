<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Paper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaperController extends Controller
{
    public function index(): Response
    {
        $papers = auth()->user()
            ->papers()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'subject', 'class_name', 'total_marks', 'created_at', 'updated_at'])
            ->map(fn (Paper $paper) => [
                'id'          => $paper->id,
                'name'        => $paper->name,
                'subject'     => $paper->subject,
                'class_name'  => $paper->class_name,
                'total_marks' => $paper->total_marks,
                'created_at'  => $paper->created_at->toISOString(),
                'updated_at'  => $paper->updated_at->toISOString(),
            ]);

        return Inertia::render('customer/papers/index', [
            'papers' => $papers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'              => 'required|string|max:255',
            'subject'           => 'nullable|string|max:150',
            'class_name'        => 'nullable|string|max:150',
            'total_marks'       => 'required|integer|min:0',
            'paper_data'        => 'required|array',
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
            'name'              => 'required|string|max:255',
            'subject'           => 'nullable|string|max:150',
            'class_name'        => 'nullable|string|max:150',
            'total_marks'       => 'required|integer|min:0',
            'paper_data'        => 'required|array',
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
            'id'         => $paper->id,
            'name'       => $paper->name,
            'paper'      => $paperData['paper'] ?? null,
            'questionPoolsByType' => $paperData['questionPoolsByType'] ?? [],
            'questionSelection'   => $paperData['questionSelection'] ?? null,
            'meta'                => $paperData['meta'] ?? null,
        ];

        return Inertia::render('customer/papers/generate', array_merge(
            GeneratePaperController::pageData(),
            ['savedPaper' => $savedPaper]
        ));
    }
}

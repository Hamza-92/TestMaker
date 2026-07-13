<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\PaperFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaperFolderController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => ['required', 'string', 'max:120'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $folder = PaperFolder::create([
            'user_id' => $request->user()->id,
            'name'    => $data['name'],
            'color'   => $data['color'] ?? null,
        ]);

        return response()->json([
            'id'    => $folder->id,
            'name'  => $folder->name,
            'color' => $folder->color,
        ], 201);
    }

    public function update(Request $request, PaperFolder $folder): RedirectResponse
    {
        abort_if($folder->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'name'  => ['required', 'string', 'max:120'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $folder->update($data);

        return redirect()->route('customer.papers.index');
    }

    public function destroy(Request $request, PaperFolder $folder): RedirectResponse
    {
        abort_if($folder->user_id !== $request->user()->id, 403);

        $folder->delete();

        return redirect()->route('customer.papers.index');
    }
}

<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Pattern;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PatternController extends Controller
{
    public function index()
    {
        $patterns = Pattern::orderByDesc('created_at')
            ->get(['id', 'name', 'short_name', 'status', 'created_at']);

        return Inertia::render('superadmin/patterns', [
            'patterns' => $patterns,
        ]);
    }

    public function create()
    {
        return Inertia::render('superadmin/patterns/add');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100', 'unique:patterns,name'],
            'short_name' => ['nullable', 'string', 'max:50'],
            'status'     => ['required', 'boolean'],
        ]);

        $validated['created_by'] = auth()->id();

        Pattern::create($validated);

        return redirect()->route('superadmin.patterns')
            ->with('success', 'Pattern created successfully.');
    }

    public function edit(Pattern $pattern)
    {
        return Inertia::render('superadmin/patterns/edit', [
            'pattern' => $pattern->only(['id', 'name', 'short_name', 'status']),
        ]);
    }

    public function update(Request $request, Pattern $pattern)
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100', Rule::unique('patterns', 'name')->ignore($pattern->id)],
            'short_name' => ['nullable', 'string', 'max:50'],
            'status'     => ['required', 'boolean'],
        ]);

        $pattern->update($validated);

        return redirect()->route('superadmin.patterns')
            ->with('success', 'Pattern updated successfully.');
    }

    public function destroy(Pattern $pattern)
    {
        $pattern->delete();

        return redirect()->route('superadmin.patterns')
            ->with('success', 'Pattern deleted successfully.');
    }
}

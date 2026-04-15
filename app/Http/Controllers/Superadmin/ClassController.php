<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Pattern;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ClassController extends Controller
{
    public function index()
    {
        $classes = SchoolClass::with('patterns:id,name,short_name')
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'status', 'created_at']);

        return Inertia::render('superadmin/classes', [
            'classes' => $classes,
        ]);
    }

    public function create()
    {
        $patterns = Pattern::where('status', 1)
            ->orderBy('name')
            ->get(['id', 'name', 'short_name']);

        return Inertia::render('superadmin/classes/add', [
            'patterns' => $patterns,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:50', 'unique:classes,name'],
            'status'      => ['required', 'boolean'],
            'pattern_ids' => ['array'],
            'pattern_ids.*' => ['integer', 'exists:patterns,id'],
        ]);

        $class = SchoolClass::create([
            'name'       => $validated['name'],
            'status'     => $validated['status'],
            'created_by' => auth()->id(),
        ]);

        $class->patterns()->sync($validated['pattern_ids'] ?? []);

        return redirect()->route('superadmin.classes')
            ->with('success', 'Class created successfully.');
    }

    public function edit(SchoolClass $class)
    {
        $patterns = Pattern::where('status', 1)
            ->orderBy('name')
            ->get(['id', 'name', 'short_name']);

        $class->load('patterns:id');

        return Inertia::render('superadmin/classes/edit', [
            'schoolClass' => [
                'id'          => $class->id,
                'name'        => $class->name,
                'status'      => $class->status,
                'pattern_ids' => $class->patterns->pluck('id'),
            ],
            'patterns' => $patterns,
        ]);
    }

    public function update(Request $request, SchoolClass $class)
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:50', Rule::unique('classes', 'name')->ignore($class->id)],
            'status'        => ['required', 'boolean'],
            'pattern_ids'   => ['array'],
            'pattern_ids.*' => ['integer', 'exists:patterns,id'],
        ]);

        $class->update([
            'name'   => $validated['name'],
            'status' => $validated['status'],
        ]);

        $class->patterns()->sync($validated['pattern_ids'] ?? []);

        return redirect()->route('superadmin.classes')
            ->with('success', 'Class updated successfully.');
    }

    public function destroy(SchoolClass $class)
    {
        $class->delete();

        return redirect()->route('superadmin.classes')
            ->with('success', 'Class deleted successfully.');
    }
}

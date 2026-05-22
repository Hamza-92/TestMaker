<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class GeneratePaperController extends Controller
{
    public function index()
    {
        return Inertia::render('customer/papers/generate', [
            'patterns' => Pattern::where('status', 1)
                ->orderBy('name')
                ->get(['id', 'name']),

            'patternClasses' => DB::table('pattern_classes')
                ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                ->where('classes.status', 1)
                ->orderBy('classes.name')
                ->select('pattern_classes.pattern_id', 'classes.id', 'classes.name')
                ->get(),

            'classSubjects' => ClassSubject::join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                ->where('subjects.status', 1)
                ->orderBy('subjects.name_eng')
                ->select(
                    'class_subjects.class_id',
                    'class_subjects.pattern_id',
                    'class_subjects.subject_id',
                    'subjects.name_eng as name'
                )
                ->get(),
        ]);
    }

    /**
     * Return chapters (with their topics) for the given pattern + class + subject.
     * Used by the Generate Paper page once the three smart selects are filled.
     */
    public function chapters(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pattern_id' => 'required|integer|exists:patterns,id',
            'class_id'   => 'required|integer|exists:classes,id',
            'subject_id' => 'required|integer|exists:subjects,id',
        ]);

        $chapters = Chapter::query()
            ->where('pattern_id', $data['pattern_id'])
            ->where('class_id', $data['class_id'])
            ->where('subject_id', $data['subject_id'])
            ->where('status', 1)
            ->with(['topics' => function ($q) {
                $q->where('status', 1)
                    ->orderBy('sort_id')
                    ->orderBy('id')
                    ->select('id', 'chapter_id', 'name');
            }])
            ->orderBy('sort_id')
            ->orderBy('chapter_number')
            ->orderBy('id')
            ->get(['id', 'name', 'chapter_number', 'group_name', 'group_heading'])
            ->map(fn (Chapter $c) => [
                'id'             => $c->id,
                'name'           => $c->name,
                'chapter_number' => $c->chapter_number,
                'group_name'     => $c->group_name,
                'group_heading'  => $c->group_heading,
                'topics'         => $c->topics->map(fn ($t) => [
                    'id'   => $t->id,
                    'name' => $t->name,
                ])->values(),
            ])
            ->values();

        return response()->json(['chapters' => $chapters]);
    }
}

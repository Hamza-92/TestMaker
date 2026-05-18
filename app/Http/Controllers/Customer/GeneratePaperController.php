<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\ClassSubject;
use App\Models\Pattern;
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
}

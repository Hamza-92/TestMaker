<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Support\AppUserAccess;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class QatCatalogueController extends Controller
{
    public function index(): Response
    {
        $user = auth()->user();
        $access = AppUserAccess::resolve($user);
        $subjects = DB::table('qat_subjects')
            ->join('qat_classes', 'qat_classes.id', '=', 'qat_subjects.qat_class_id')
            ->join('qat_catalogues', 'qat_catalogues.id', '=', 'qat_classes.qat_catalogue_id')
            ->leftJoin('qat_chapters', function ($join): void {
                $join->on('qat_chapters.qat_subject_id', '=', 'qat_subjects.id')
                    ->where('qat_chapters.status', true);
            })
            ->where('qat_classes.status', true)
            ->where('qat_subjects.status', true)
            ->select('qat_subjects.id', 'qat_subjects.source_pattern_id', 'qat_classes.source_class_id',
                'qat_subjects.subject_id', 'qat_catalogues.academic_year', 'qat_classes.name as class_name',
                'qat_subjects.subject_name')
            ->selectRaw('count(qat_chapters.id) as chapter_count')
            ->groupBy('qat_subjects.id', 'qat_subjects.source_pattern_id', 'qat_classes.source_class_id',
                'qat_subjects.subject_id', 'qat_catalogues.academic_year', 'qat_classes.name', 'qat_subjects.subject_name')
            ->orderByDesc('qat_catalogues.academic_year')->orderBy('qat_classes.name')->orderBy('qat_subjects.subject_name')
            ->get()
            ->filter(fn ($subject) => $user->isSchoolOwner() || AppUserAccess::allowsSubject(
                $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id, (int) $subject->subject_id,
            ))
            ->values();

        return Inertia::render('customer/qat/index', ['subjects' => $subjects]);
    }
}

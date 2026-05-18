<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use Inertia\Inertia;

class GeneratePaperController extends Controller
{
    public function index()
    {
        return Inertia::render('customer/papers/generate', [
            'classes'       => SchoolClass::where('status', 1)->orderBy('name')->get(['id', 'name']),
            'questionTypes' => QuestionType::where('status', 1)->orderBy('name')->get(['id', 'name', 'name_ur', 'is_objective']),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\QuestionType;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QatDataController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'year' => ['nullable', 'string', 'max:7'],
            'q' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
        ]);

        $classes = DB::table('qat_classes')
            ->join('qat_catalogues', 'qat_catalogues.id', '=', 'qat_classes.qat_catalogue_id')
            ->select('qat_classes.id', 'qat_classes.name', 'qat_classes.status', 'qat_catalogues.academic_year')
            ->selectSub(DB::table('qat_subjects')->selectRaw('count(*)')
                ->whereColumn('qat_subjects.qat_class_id', 'qat_classes.id'), 'subject_count')
            ->selectSub(DB::table('qat_chapters')
                ->join('qat_subjects', 'qat_subjects.id', '=', 'qat_chapters.qat_subject_id')
                ->selectRaw('count(*)')
                ->whereColumn('qat_subjects.qat_class_id', 'qat_classes.id'), 'chapter_count')
            ->when($filters['year'] ?? null, fn ($query, $year) => $query->where('qat_catalogues.academic_year', $year))
            ->when($filters['q'] ?? null, fn ($query, $q) => $query->where('qat_classes.name', 'like', '%'.$q.'%'))
            ->when(($filters['status'] ?? 'all') !== 'all', fn ($query) => $query->where('qat_classes.status', $filters['status'] === 'active'))
            ->orderByDesc('qat_catalogues.academic_year')->orderBy('qat_classes.name')
            ->paginate(20)->withQueryString();

        return Inertia::render('superadmin/qat-catalogue', [
            'classes' => $classes,
            'years' => DB::table('qat_catalogues')->orderByDesc('academic_year')->pluck('academic_year'),
            'filters' => $filters,
        ]);
    }

    public function showClass(Request $request, int $qatClass): Response
    {
        $class = $this->classRow($qatClass);
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
        ]);
        $subjects = DB::table('qat_subjects')
            ->where('qat_class_id', $qatClass)
            ->select('id', 'subject_name', 'source_pattern_name', 'status')
            ->selectSub(DB::table('qat_chapters')->selectRaw('count(*)')
                ->whereColumn('qat_chapters.qat_subject_id', 'qat_subjects.id'), 'chapter_count')
            ->selectSub(DB::table('qat_questions')
                ->join('qat_chapters', 'qat_chapters.id', '=', 'qat_questions.qat_chapter_id')
                ->selectRaw('count(*)')
                ->whereColumn('qat_chapters.qat_subject_id', 'qat_subjects.id'), 'question_count')
            ->when($filters['q'] ?? null, fn ($query, $q) => $query->where('subject_name', 'like', '%'.$q.'%'))
            ->when(($filters['status'] ?? 'all') !== 'all', fn ($query) => $query->where('status', $filters['status'] === 'active'))
            ->orderBy('subject_name')->paginate(20)->withQueryString();

        return Inertia::render('superadmin/qat-catalogue/class', [
            'qatClass' => $class,
            'subjects' => $subjects,
            'filters' => $filters,
        ]);
    }

    public function showSubject(Request $request, int $qatClass, int $qatSubject): Response
    {
        $class = $this->classRow($qatClass);
        $subject = $this->subjectRow($qatClass, $qatSubject);
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
            'month' => ['nullable', 'integer', 'between:1,12'],
        ]);
        $chapters = DB::table('qat_chapters')
            ->where('qat_subject_id', $qatSubject)
            ->select('id', 'name', 'name_ur', 'chapter_number', 'sort_id', 'status')
            ->selectSub(DB::table('qat_topics')->selectRaw('count(*)')
                ->whereColumn('qat_topics.qat_chapter_id', 'qat_chapters.id'), 'topic_count')
            ->selectSub(DB::table('qat_questions')->selectRaw('count(*)')
                ->whereColumn('qat_questions.qat_chapter_id', 'qat_chapters.id'), 'question_count')
            ->when($filters['q'] ?? null, fn ($query, $q) => $query->where('name', 'like', '%'.$q.'%'))
            ->when(($filters['status'] ?? 'all') !== 'all', fn ($query) => $query->where('status', $filters['status'] === 'active'))
            ->when($filters['month'] ?? null, fn ($query, $month) => $query->whereExists(
                fn ($subquery) => $subquery->selectRaw('1')->from('qat_chapter_months')
                    ->whereColumn('qat_chapter_months.qat_chapter_id', 'qat_chapters.id')
                    ->where('month', $month)
            ))
            ->orderBy('sort_id')->orderBy('id')->paginate(20)->withQueryString();
        $months = DB::table('qat_chapter_months')->whereIn('qat_chapter_id', $chapters->getCollection()->pluck('id'))
            ->get(['qat_chapter_id', 'month'])->groupBy('qat_chapter_id');
        $chapters->getCollection()->transform(function ($chapter) use ($months) {
            $chapter->months = $months->get($chapter->id, collect())->pluck('month')->sort()->values();

            return $chapter;
        });

        return Inertia::render('superadmin/qat-catalogue/subject', [
            'qatClass' => $class,
            'subject' => $subject,
            'chapters' => $chapters,
            'filters' => $filters,
        ]);
    }

    public function showChapter(Request $request, int $qatClass, int $qatSubject, int $qatChapter): Response
    {
        $class = $this->classRow($qatClass);
        $subject = $this->subjectRow($qatClass, $qatSubject);
        $chapter = $this->chapterRow($qatSubject, $qatChapter);
        $chapter->months = DB::table('qat_chapter_months')->where('qat_chapter_id', $qatChapter)->orderBy('month')->pluck('month');
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
        ]);
        $topics = DB::table('qat_topics')
            ->where('qat_chapter_id', $qatChapter)
            ->select('id', 'name', 'name_ur', 'sort_id', 'status')
            ->selectSub(DB::table('qat_questions')->selectRaw('count(*)')
                ->whereColumn('qat_questions.qat_topic_id', 'qat_topics.id'), 'question_count')
            ->when($filters['q'] ?? null, fn ($query, $q) => $query->where('name', 'like', '%'.$q.'%'))
            ->when(($filters['status'] ?? 'all') !== 'all', fn ($query) => $query->where('status', $filters['status'] === 'active'))
            ->orderBy('sort_id')->orderBy('id')->paginate(20)->withQueryString();

        return Inertia::render('superadmin/qat-catalogue/chapter', [
            'qatClass' => $class,
            'subject' => $subject,
            'chapter' => $chapter,
            'topics' => $topics,
            'filters' => $filters,
        ]);
    }

    public function questions(Request $request, int $qatClass, int $qatSubject, int $qatChapter): Response
    {
        $class = $this->classRow($qatClass);
        $subject = $this->subjectRow($qatClass, $qatSubject);
        $chapter = $this->chapterRow($qatSubject, $qatChapter);
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
            'topic' => ['nullable', 'integer'],
            'type' => ['nullable', 'integer'],
        ]);
        $questions = DB::table('qat_questions')
            ->leftJoin('qat_topics', 'qat_topics.id', '=', 'qat_questions.qat_topic_id')
            ->where('qat_questions.qat_chapter_id', $qatChapter)
            ->select('qat_questions.id', 'qat_questions.question_type_id', 'qat_questions.qat_topic_id',
                'qat_questions.status', 'qat_questions.question_data', 'qat_topics.name as topic_name')
            ->when($filters['q'] ?? null, fn ($query, $q) => $query->where('qat_questions.question_data', 'like', '%'.$q.'%'))
            ->when(($filters['status'] ?? 'all') !== 'all', fn ($query) => $query->where('qat_questions.status', $filters['status'] === 'active'))
            ->when($filters['topic'] ?? null, fn ($query, $topic) => $query->where('qat_questions.qat_topic_id', $topic))
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('qat_questions.question_type_id', $type))
            ->orderBy('qat_questions.id')->paginate(20)->withQueryString();
        $questionTypes = QuestionType::query()->whereIn('id', $questions->getCollection()->pluck('question_type_id'))
            ->get()->keyBy('id');
        $questions->getCollection()->transform(function ($question) use ($questionTypes) {
            $data = json_decode($question->question_data, true) ?: [];
            unset($question->question_data);
            $question->statement_en = $data['statement_en'] ?? '';
            $question->statement_ur = $data['statement_ur'] ?? '';
            $question->type_name = $data['question_type']['name'] ?? 'Type '.$question->question_type_id;
            $question->summary_text = $question->statement_en ?: $question->statement_ur;
            if (! $question->summary_text && $questionTypes->has($question->question_type_id)) {
                $question->summary_text = QuestionTypeSchemaRegistry::summarize(
                    $questionTypes->get($question->question_type_id), (array) ($data['content'] ?? [])
                );
            }
            if (! $question->summary_text) {
                $question->summary_text = 'Question #'.$question->id;
            }
            $question->options = collect($data['options'] ?? [])->map(fn ($option) => [
                'text_en' => $option['text_en'] ?? null,
                'text_ur' => $option['text_ur'] ?? null,
                'is_correct' => (bool) ($option['is_correct'] ?? false),
            ])->values();
            $question->description_en = $data['description_en'] ?? null;
            $question->description_ur = $data['description_ur'] ?? null;
            $question->answer_en = $data['answer_en'] ?? null;
            $question->answer_ur = $data['answer_ur'] ?? null;

            return $question;
        });

        return Inertia::render('superadmin/qat-catalogue/questions', [
            'qatClass' => $class,
            'subject' => $subject,
            'chapter' => $chapter,
            'questions' => $questions,
            'topics' => DB::table('qat_topics')->where('qat_chapter_id', $qatChapter)->orderBy('sort_id')->get(['id', 'name']),
            'types' => QuestionType::query()->whereIn('id', DB::table('qat_questions')->where('qat_chapter_id', $qatChapter)
                ->distinct()->pluck('question_type_id'))->orderBy('name')->get(['id', 'name']),
            'filters' => $filters,
        ]);
    }

    public function updateClass(Request $request, int $qatClass): RedirectResponse
    {
        $this->classRow($qatClass);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'status' => ['required', 'boolean'],
        ]);
        DB::table('qat_classes')->where('id', $qatClass)->update([...$data, 'updated_at' => now()]);

        return back();
    }

    public function updateSubject(Request $request, int $qatClass, int $qatSubject): RedirectResponse
    {
        $this->subjectRow($qatClass, $qatSubject);
        $data = $request->validate([
            'subject_name' => ['required', 'string', 'max:150'],
            'status' => ['required', 'boolean'],
        ]);
        DB::table('qat_subjects')->where('id', $qatSubject)->update([...$data, 'updated_at' => now()]);

        return back();
    }

    public function updateChapter(Request $request, int $qatClass, int $qatSubject, int $qatChapter): RedirectResponse
    {
        $this->subjectRow($qatClass, $qatSubject);
        $this->chapterRow($qatSubject, $qatChapter);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'name_ur' => ['nullable', 'string', 'max:150'],
            'chapter_number' => ['nullable', 'integer', 'min:0'],
            'sort_id' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'boolean'],
            'months' => ['required', 'array', 'min:1'],
            'months.*' => ['required', 'integer', 'distinct', 'between:1,12'],
        ]);
        DB::transaction(function () use ($data, $qatChapter): void {
            DB::table('qat_chapters')->where('id', $qatChapter)->update([
                'name' => $data['name'],
                'name_ur' => $data['name_ur'] ?? null,
                'chapter_number' => $data['chapter_number'] ?? null,
                'sort_id' => $data['sort_id'],
                'status' => $data['status'],
                'updated_at' => now(),
            ]);
            DB::table('qat_chapter_months')->where('qat_chapter_id', $qatChapter)->delete();
            DB::table('qat_chapter_months')->insert(array_map(
                fn ($month) => ['qat_chapter_id' => $qatChapter, 'month' => $month],
                $data['months']
            ));
        });

        return back();
    }

    public function updateTopic(Request $request, int $qatClass, int $qatSubject, int $qatChapter, int $qatTopic): RedirectResponse
    {
        $this->subjectRow($qatClass, $qatSubject);
        $this->chapterRow($qatSubject, $qatChapter);
        abort_unless(DB::table('qat_topics')->where('id', $qatTopic)->where('qat_chapter_id', $qatChapter)->exists(), 404);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'name_ur' => ['nullable', 'string', 'max:150'],
            'sort_id' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'boolean'],
        ]);
        DB::table('qat_topics')->where('id', $qatTopic)->update([
            ...$data, 'name_ur' => $data['name_ur'] ?? null, 'updated_at' => now(),
        ]);

        return back();
    }

    public function updateQuestion(Request $request, int $qatClass, int $qatSubject, int $qatChapter, int $qatQuestion): RedirectResponse
    {
        $this->subjectRow($qatClass, $qatSubject);
        $this->chapterRow($qatSubject, $qatChapter);
        $question = DB::table('qat_questions')->where('id', $qatQuestion)->where('qat_chapter_id', $qatChapter)->first();
        abort_unless($question, 404);
        $input = $request->validate([
            'statement_en' => ['nullable', 'string', 'max:20000'],
            'statement_ur' => ['nullable', 'string', 'max:20000'],
            'status' => ['required', 'boolean'],
        ]);
        $data = json_decode($question->question_data, true) ?: [];
        $data['statement_en'] = $input['statement_en'] ?? null;
        $data['statement_ur'] = $input['statement_ur'] ?? null;
        DB::table('qat_questions')->where('id', $qatQuestion)->update([
            'question_data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'status' => $input['status'],
            'updated_at' => now(),
        ]);

        return back();
    }

    private function classRow(int $qatClass): object
    {
        $class = DB::table('qat_classes')
            ->join('qat_catalogues', 'qat_catalogues.id', '=', 'qat_classes.qat_catalogue_id')
            ->where('qat_classes.id', $qatClass)
            ->first(['qat_classes.id', 'qat_classes.name', 'qat_classes.status', 'qat_catalogues.academic_year']);
        abort_unless($class, 404);

        return $class;
    }

    private function subjectRow(int $qatClass, int $qatSubject): object
    {
        $subject = DB::table('qat_subjects')->where('id', $qatSubject)->where('qat_class_id', $qatClass)
            ->first(['id', 'subject_name', 'source_pattern_name', 'status']);
        abort_unless($subject, 404);

        return $subject;
    }

    private function chapterRow(int $qatSubject, int $qatChapter): object
    {
        $chapter = DB::table('qat_chapters')->where('id', $qatChapter)->where('qat_subject_id', $qatSubject)
            ->first(['id', 'name', 'name_ur', 'chapter_number', 'sort_id', 'status']);
        abort_unless($chapter, 404);

        return $chapter;
    }
}

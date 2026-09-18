<?php

use App\Support\SelectablePaperPdfExporter;
use Illuminate\Contracts\Console\Kernel;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$paper = [
    'header' => [
        'schoolName' => 'TESTMAKER.PK',
        'exam' => 'Monthly Test',
        'className' => '9th',
        'section' => 'A',
        'subject' => 'Physics / طبیعیات',
        'studentName' => '',
        'date' => '17-09-2026',
        'duration' => '1 Hour',
        'marks' => 7.5,
        'passingMarks' => 3,
        'rollNo' => '',
    ],
    'settings' => [
        'paperSize' => 'A4',
        'orientation' => 'portrait',
        'marginTop' => 10,
        'marginRight' => 10,
        'marginBottom' => 10,
        'marginLeft' => 10,
        'questionSize' => 12,
        'questionLineHeight' => 1.1,
        'headingSize' => 12,
        'headerSize' => 11,
        'sectionHeadingSize' => 14,
        'showSections' => true,
        'sectionHeadingBrackets' => true,
        'questionBorderWidth' => 1,
        'questionBorderStyle' => 'solid',
        'headingBorderWidth' => 1,
        'objectiveLayout' => 'board-table',
        'paperLayout' => 'standard',
        'englishFont' => 'times-new-roman',
        'bubbleSheetEnabled' => true,
        'bubbleSheetQuestionCount' => 5,
        'bubbleSheetHeadingEnabled' => true,
        'bubbleSheetHeading' => 'MCQs Answer Sheet / معروضی سوالات کی جوابی شیٹ',
    ],
    'sectioning' => ['active' => true, 'medium' => 'Both'],
    'sections' => [
        [
            'id' => 'objective',
            'category' => 'Objective Questions',
            'title' => 'Choose the Correct Option',
            'titleEnglish' => 'Choose the Correct Option',
            'titleUrdu' => 'درست جواب کا انتخاب کریں',
            'requiredQuestions' => 2,
            'totalQuestions' => 2,
            'marksEach' => 1,
            'paperSectionKey' => 'objective',
            'questions' => [
                [
                    'text' => '<div>Speed of light is:</div><div dir="rtl">روشنی کی رفتار ہے:</div>',
                    'options' => [
                        ['text' => '3 x 10^8 m/s', 'isCorrect' => true],
                        ['text' => '340 m/s'],
                        ['text' => '1500 m/s'],
                        ['text' => '0 m/s'],
                    ],
                ],
                [
                    'text' => '<div>The SI unit of force is:</div><div dir="rtl">قوت کی اکائی ہے:</div>',
                    'options' => [
                        ['text' => 'Joule'],
                        ['text' => 'Newton', 'isCorrect' => true],
                        ['text' => 'Watt'],
                        ['text' => 'Pascal'],
                    ],
                ],
            ],
        ],
        [
            'id' => 'subjective',
            'category' => 'Subjective Questions',
            'title' => 'Short Questions',
            'titleEnglish' => 'Answer the Following Short Questions',
            'titleUrdu' => 'مندرجہ ذیل مختصر سوالات کے جواب دیں',
            'requiredQuestions' => 2,
            'totalQuestions' => 3,
            'marksEach' => 2.75,
            'columns' => 2,
            'paperSectionKey' => 'subjective',
            'questions' => [
                ['text' => '<div>Define velocity.</div><div dir="rtl">سمتی رفتار کی تعریف کریں۔</div>', 'answerLines' => 1],
                ['text' => '<div>What is inertia?</div><div dir="rtl">جمود کیا ہے؟</div>', 'answerLines' => 1],
                ['text' => '<div>State Newton\'s first law.</div><div dir="rtl">نیوٹن کا پہلا قانون بیان کریں۔</div>', 'answerLines' => 1],
            ],
        ],
    ],
];

$response = $app->make(SelectablePaperPdfExporter::class)->download([
    'paper' => $paper,
    'pdfState' => ['numSets' => 1, 'viewMode' => 'paper'],
], 'Selectable Bilingual Paper');

file_put_contents(dirname(__DIR__, 2).'/output/pdf/selectable-bilingual-paper.pdf', $response->getContent());

<?php

use App\Support\Qat\QatPaperBuilder;

test('QAT questions use the question type schema when the copied schema is empty', function () {
    $question = (object) [
        'id' => 1,
        'chapter_id' => 2,
        'chapter_name' => 'Math',
        'topic_name' => null,
        'question_type_id' => 3,
        'type_name' => 'Short Question',
        'is_objective' => false,
        'question_data' => json_encode([
            'schema_key' => '',
            'question_type' => ['schema_key' => 'subjective_same_statement'],
            'statement_en' => 'Find the HCF.',
            'description_en' => '42, 49',
            'description_ur' => '42، 49',
        ]),
    ];

    $presented = (new QatPaperBuilder)->presentQuestion($question);

    expect($presented['schema_key'])->toBe('subjective_same_statement')
        ->and($presented['description_en'])->toBe('42, 49')
        ->and($presented['description_ur'])->toBe('42، 49');
});

test('QAT group alternatives share the slot and preserve the chosen types and headings', function () {
    $choices = collect(['Letter', 'Story', 'Application'])->map(fn ($title, $index) => [
        'question_type_id' => $index + 1,
        'title' => $title,
        'heading_en' => "$title instructions",
        'required_questions' => 1,
        'questions' => [
            ['id' => $index + 11, 'question_type_id' => $index + 1, 'marks' => 5],
        ],
    ])->all();
    $section = (new QatPaperBuilder)->orGroupSection(4, $choices);

    expect($section['question_type_id'])->toBe(4)
        ->and($section['required_questions'])->toBe(1)
        ->and($section['heading_en'])->toBe('Letter instructions')
        ->and(array_column($section['or_headings'], 'heading_en'))->toBe(['Story instructions', 'Application instructions'])
        ->and($section['questions'])->toHaveCount(1)
        ->and($section['questions'][0]['marks'])->toBe(5)
        ->and(array_column($section['questions'][0]['or_questions'], 'id'))->toBe([12, 13]);
});

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

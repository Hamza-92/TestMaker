<?php

use App\Models\QuestionType;

it('recognizes existing Urdu and English poem types while allowing explicit overrides', function () {
    $urdu = new QuestionType(['name' => 'نظم کے اشعار کی تشریح', 'is_objective' => false]);
    $english = new QuestionType(['name' => 'Paraphrase the stanza', 'is_objective' => false]);
    $prose = new QuestionType(['name' => 'Short Question', 'is_objective' => false]);
    $poemQuestions = new QuestionType(['name' => 'Answer Question from ( Poem )', 'is_objective' => false]);
    $arabic = new QuestionType(['name' => 'Translation of Verses and Questions', 'is_objective' => false]);

    expect($urdu->usesVerseLayout())->toBeTrue()
        ->and($english->usesVerseLayout())->toBeTrue()
        ->and($prose->usesVerseLayout())->toBeFalse()
        ->and($poemQuestions->usesVerseLayout())->toBeFalse()
        ->and($arabic->usesVerseLayout())->toBeFalse();

    $urdu->verse_layout = false;
    $prose->verse_layout = true;
    $prose->is_objective = true;

    expect($urdu->usesVerseLayout())->toBeFalse()
        ->and($prose->usesVerseLayout())->toBeFalse();
});

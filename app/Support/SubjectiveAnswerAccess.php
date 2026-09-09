<?php

namespace App\Support;

use App\Enums\AccountType;
use App\Models\TrialSetting;
use App\Models\User;

final class SubjectiveAnswerAccess
{
    public static function allows(User $user): bool
    {
        $subscription = $user->activeSchoolSubscription();

        if ($subscription !== null) {
            return (bool) $subscription->allow_subjective_answers;
        }

        $owner = $user->schoolOwner();

        return $owner?->account_type === AccountType::Trial
            && (bool) TrialSetting::current()->allow_subjective_answers;
    }

    public static function redactQuestionContent(array $content): array
    {
        foreach ($content as $key => $value) {
            if (is_string($key) && self::isAnswerKey($key)) {
                $content[$key] = null;

                continue;
            }

            if (is_array($value)) {
                $content[$key] = self::redactQuestionContent($value);
            }
        }

        return $content;
    }

    public static function redactPaperData(array $paperData): array
    {
        if (isset($paperData['paper']['sections']) && is_array($paperData['paper']['sections'])) {
            $paperData['paper']['sections'] = array_map(
                fn (mixed $section) => is_array($section)
                    ? self::redactGeneratedSection($section)
                    : $section,
                $paperData['paper']['sections'],
            );
        }

        if (isset($paperData['questionPoolsByType']) && is_array($paperData['questionPoolsByType'])) {
            foreach ($paperData['questionPoolsByType'] as $typeId => $questions) {
                if (! is_array($questions)) {
                    continue;
                }

                $paperData['questionPoolsByType'][$typeId] = array_map(
                    function (mixed $question): mixed {
                        if (! is_array($question) || (bool) ($question['isObjective'] ?? false)) {
                            return $question;
                        }

                        if (isset($question['content']) && is_array($question['content'])) {
                            $question['content'] = self::redactQuestionContent($question['content']);
                        }

                        return $question;
                    },
                    $questions,
                );
            }
        }

        return $paperData;
    }

    private static function redactGeneratedSection(array $section): array
    {
        if (($section['category'] ?? null) !== 'Subjective Questions') {
            return $section;
        }

        if (isset($section['questions']) && is_array($section['questions'])) {
            $section['questions'] = array_map(
                fn (mixed $question) => is_array($question)
                    ? self::redactGeneratedQuestion($question)
                    : $question,
                $section['questions'],
            );
        }

        if (isset($section['multipart']['rows']) && is_array($section['multipart']['rows'])) {
            foreach ($section['multipart']['rows'] as $rowIndex => $row) {
                if (! is_array($row) || ! isset($row['parts']) || ! is_array($row['parts'])) {
                    continue;
                }

                foreach ($row['parts'] as $partIndex => $part) {
                    if (! is_array($part) || ! isset($part['question']) || ! is_array($part['question'])) {
                        continue;
                    }

                    $section['multipart']['rows'][$rowIndex]['parts'][$partIndex]['question'] =
                        self::redactGeneratedQuestion($part['question']);
                }
            }
        }

        return $section;
    }

    private static function redactGeneratedQuestion(array $question): array
    {
        $question['answerText'] = null;

        if (isset($question['options']) && is_array($question['options'])) {
            foreach ($question['options'] as $index => $option) {
                if (is_array($option)) {
                    $question['options'][$index]['isCorrect'] = false;
                }
            }
        }

        if (isset($question['passageQuestions']) && is_array($question['passageQuestions'])) {
            foreach ($question['passageQuestions'] as $passageIndex => $passageQuestion) {
                if (! is_array($passageQuestion) || ! isset($passageQuestion['options']) || ! is_array($passageQuestion['options'])) {
                    continue;
                }

                foreach ($passageQuestion['options'] as $optionIndex => $option) {
                    if (is_array($option)) {
                        $question['passageQuestions'][$passageIndex]['options'][$optionIndex]['isCorrect'] = false;
                    }
                }
            }
        }

        return $question;
    }

    private static function isAnswerKey(string $key): bool
    {
        return preg_match('/^(?:answer|correct)(?:_|$)|^is_correct$/i', $key) === 1;
    }
}

<?php

namespace App\Support\Questions;

use App\Models\QuestionTypeHeading;
use Illuminate\Support\Collection;

class QuestionTypeHeadingResolver
{
    /** Apply display-only headings to copies; never alter the default model attributes. */
    public static function apply(Collection $types, int $patternId, ?int $classId = null, ?int $subjectId = null, bool $includeExact = true): Collection
    {
        if ($types->isEmpty()) {
            return $types;
        }

        $keys = [QuestionTypeHeading::scopeKey($patternId)];
        if ($classId !== null) {
            $keys[] = QuestionTypeHeading::scopeKey($patternId, $classId);
            if ($subjectId !== null) {
                $keys[] = QuestionTypeHeading::scopeKey($patternId, $classId, $subjectId);
            }
        }
        if (! $includeExact) {
            array_pop($keys);
        }

        $overrides = QuestionTypeHeading::query()
            ->whereIn('question_type_id', $types->pluck('id'))
            ->whereIn('scope_key', $keys)
            ->get()->groupBy('question_type_id');

        return $types->map(function ($type) use ($keys, $overrides) {
            $resolved = clone $type;
            $byScope = $overrides->get($type->id, collect())->keyBy('scope_key');
            foreach ($keys as $key) {
                $override = $byScope->get($key);
                foreach (['heading_en', 'heading_ur'] as $field) {
                    if ($override !== null && filled($override->{$field})) {
                        $resolved->{$field} = $override->{$field};
                    }
                }
            }

            return $resolved;
        });
    }
}

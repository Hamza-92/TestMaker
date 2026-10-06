<?php

namespace App\Support;

use App\Models\PaperDefault;
use App\Models\User;
use Illuminate\Validation\Rule;

class CustomerPaperDefaults
{
    public static function forUser(User $user): ?array
    {
        $owner = $user->schoolOwner();
        if ($owner === null) {
            return null;
        }

        $defaults = PaperDefault::where('user_id', $owner->id)->first();
        if ($defaults === null) {
            return null;
        }

        return [
            'settings' => $defaults->settings,
            'header' => $defaults->header,
            'viewMode' => $defaults->view_mode === 'subjective_answers' && ! SubjectiveAnswerAccess::allows($user)
                ? 'paper' : $defaults->view_mode,
            'numSets' => $defaults->num_sets,
        ];
    }

    public static function rules(User $user): array
    {
        $settings = [];
        foreach ([
            'headerSize' => [10, 28], 'headingSize' => [10, 28], 'questionSize' => [10, 24],
            'sectionHeadingSize' => [10, 28],
            'headerLineHeight' => [1, 3], 'headingLineHeight' => [1, 3],
            'questionLineHeight' => [1, 3], 'sectionHeadingLineHeight' => [1, 3],
            'headerPaddingX' => [0, 24], 'headerPaddingY' => [0, 24],
            'headerBorderWidth' => [0, 6], 'headingBorderWidth' => [0, 6],
            'questionBorderWidth' => [0, 6], 'sectionHeadingBorderWidth' => [0, 6],
            'marginTop' => [0, 50], 'marginRight' => [0, 50],
            'marginBottom' => [0, 50], 'marginLeft' => [0, 50],
            'sectionSpacing' => [0, 20], 'orGroupGap' => [0, 10], 'watermarkOpacity' => [0, 100],
        ] as $key => [$min, $max]) {
            $settings[$key] = ['sometimes', 'numeric', "min:{$min}", "max:{$max}"];
        }
        foreach ([
            'englishFont' => ['times-new-roman', 'jameel-noori', 'sans', 'serif', 'mono'],
            'urduFont' => ['jameel-noori', 'noto-nastaliq', 'mehr-nastaliq', 'noto-naskh-arabic', 'amiri', 'noto-sans-arabic', 'noto-kufi-arabic'],
            'headerBorderStyle' => ['solid', 'dashed', 'dotted'],
            'headingBorderStyle' => ['solid', 'dashed', 'dotted'],
            'questionBorderStyle' => ['solid', 'dashed', 'dotted'],
            'sectionHeadingBorderStyle' => ['solid', 'dashed', 'dotted'],
            'paperSize' => ['A4', 'Letter', 'Legal'], 'orientation' => ['portrait', 'landscape'],
            'watermarkType' => ['text', 'logo'],
            'pageNumberPosition' => ['footer-center', 'footer-right', 'header-right'],
            'pageNumberFormat' => ['page-n', 'n-of-m', 'just-n'],
            'questionNumberingFormat' => ['default', 'numeric', 'roman', 'alpha'],
            'questionLayout' => ['default', 'stacked', 'columns', 'inline'],
            'orGroupLayout' => ['stacked', 'side-by-side'],
            'orGroupDividerStyle' => ['line', 'badge', 'plain'],
            'orGroupLabel' => ['auto', 'english', 'urdu', 'bilingual'],
            'headerTemplate' => ['classic', 'banner', 'formal', 'centered', 'tabular'],
            'bubbleSheetMode' => ['inline', 'separate-page', 'only'],
            'bubbleSheetNumberFormat' => ['number', 'question'],
        ] as $key => $values) {
            $settings[$key] = ['sometimes', Rule::in($values)];
        }
        foreach (['showSections', 'sectionHeadingBrackets', 'bubbleSheetEnabled', 'bubbleSheetHeadingEnabled', 'pageNumbersEnabled', 'repeatTableHeaders'] as $key) {
            $settings[$key] = ['sometimes', 'boolean'];
        }
        $settings['bubbleSheetQuestionCount'] = ['sometimes', 'integer', 'min:1', 'max:200'];
        $settings['printCopies'] = ['sometimes', 'integer', 'min:1', 'max:4'];
        $settings['bubbleSheetHeading'] = ['sometimes', 'nullable', 'string', 'max:20000'];
        $settings['watermarkText'] = ['sometimes', 'nullable', 'string', 'max:500'];
        $settings['watermarkLogoUrl'] = ['sometimes', 'nullable', 'string', 'max:3000000', function ($attribute, $value, $fail) {
            if ($value !== null && $value !== '' && ! preg_match('~^(?:https?://|/(?!/)|data:image/[a-z0-9.+-]+;base64,)~i', $value)) {
                $fail('Use an image URL or an uploaded image for the watermark.');
            }
        }];
        $settings['textColor'] = ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/'];

        $rules = [
            'settings' => ['required', 'array:'.implode(',', array_keys($settings))],
            'header' => ['required', 'array:exam,section,type,duration'],
            'viewMode' => ['required', Rule::in(SubjectiveAnswerAccess::allows($user)
                ? ['paper', 'answer_key', 'answers_on_paper', 'subjective_answers']
                : ['paper', 'answer_key', 'answers_on_paper'])],
            'numSets' => ['required', 'integer', 'min:1', 'max:3'],
        ];
        foreach ($settings as $key => $rule) {
            $rules["settings.{$key}"] = $rule;
        }
        foreach (['exam', 'section', 'type', 'duration'] as $key) {
            $rules["header.{$key}"] = ['sometimes', 'nullable', 'string', 'max:255'];
        }

        return $rules;
    }
}

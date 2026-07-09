<?php

namespace App\Enums;

enum TeacherPermission: string
{
    case GeneratePapers    = 'generate_papers';
    case ViewQuestionBank  = 'view_question_bank';
    case ManageOwnPapers   = 'manage_own_papers';
    case ViewSchoolPapers  = 'view_school_papers';

    public function label(): string
    {
        return match ($this) {
            self::GeneratePapers    => 'Generate Papers',
            self::ViewQuestionBank  => 'View Question Bank',
            self::ManageOwnPapers   => 'Manage Own Papers',
            self::ViewSchoolPapers  => 'View School Papers',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::GeneratePapers    => 'Create new papers from the question bank.',
            self::ViewQuestionBank  => 'Browse questions across allowed subjects and chapters.',
            self::ManageOwnPapers   => 'Save, edit, and delete papers they created.',
            self::ViewSchoolPapers  => 'See papers created by other teachers of the school.',
        };
    }

    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    public static function defaults(): array
    {
        return [
            self::GeneratePapers->value,
            self::ViewQuestionBank->value,
            self::ManageOwnPapers->value,
        ];
    }
}

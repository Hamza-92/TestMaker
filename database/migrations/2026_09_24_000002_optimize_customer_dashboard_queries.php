<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('papers', function (Blueprint $table): void {
            $table->unsignedInteger('questions_count')->default(0)->after('paper_data');
        });

        DB::table('papers')
            ->select(['id', 'paper_data'])
            ->orderBy('id')
            ->chunkById(200, function ($papers): void {
                foreach ($papers as $paper) {
                    DB::table('papers')
                        ->where('id', $paper->id)
                        ->update([
                            'questions_count' => $this->countQuestions($paper->paper_data),
                        ]);
                }
            });

        Schema::table('papers', function (Blueprint $table): void {
            $table->index(
                ['user_id', 'is_draft', 'created_at', 'subject'],
                'papers_dashboard_usage_index',
            );
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->index(
                ['school_id', 'user_type', 'status'],
                'users_school_teacher_status_index',
            );
        });

        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->index(
                ['changed_by', 'auditable_type', 'created_at'],
                'audit_logs_dashboard_activity_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropIndex('audit_logs_dashboard_activity_index');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex('users_school_teacher_status_index');
        });

        Schema::table('papers', function (Blueprint $table): void {
            $table->dropIndex('papers_dashboard_usage_index');
            $table->dropColumn('questions_count');
        });
    }

    private function countQuestions(mixed $storedPaperData): int
    {
        $paperData = $this->decodePaperData($storedPaperData);
        $sections = data_get($paperData, 'paper.sections', []);

        if (! is_array($sections)) {
            return 0;
        }

        return array_sum(array_map(
            static fn ($section): int => is_array($section['questions'] ?? null)
                ? count($section['questions'])
                : 0,
            $sections,
        ));
    }

    private function decodePaperData(mixed $storedPaperData): array
    {
        $paperData = is_string($storedPaperData)
            ? json_decode($storedPaperData, true)
            : $storedPaperData;

        if (! is_array($paperData)) {
            return [];
        }

        if (! isset($paperData['__tm_compressed'])) {
            return $paperData;
        }

        $compressed = base64_decode((string) $paperData['__tm_compressed'], true);
        $json = $compressed === false ? false : gzdecode($compressed);
        $expanded = $json === false ? null : json_decode($json, true);

        return is_array($expanded) ? $expanded : [];
    }
};

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class CleanupTopicWiseChapterGroups extends Command
{
    protected $signature = 'cleanup:topic-wise-chapter-groups {--apply : Back up and clear the matching group fields}';

    protected $description = 'Temporarily audit or clear chapter groups from topic-wise subject scopes';

    public function handle(): int
    {
        if (! $this->hasRequiredSchema()) {
            return self::FAILURE;
        }

        $affected = $this->affectedChapters()->count();

        $this->info("Topic-wise chapters with group data: {$affected}");

        if ($affected === 0) {
            $this->info('Nothing needs to be changed.');

            return self::SUCCESS;
        }

        $this->showSample();

        if (! $this->option('apply')) {
            $this->newLine();
            $this->comment('Dry run only. Run again with --apply to create a backup and clear these fields.');

            return self::SUCCESS;
        }

        try {
            $backupTable = $this->createBackup($affected);
        } catch (\Throwable $exception) {
            $this->error($exception->getMessage());
            $this->warn('Cleanup was not started because the backup could not be verified.');

            return self::FAILURE;
        }

        try {
            $updated = DB::transaction(function () use ($backupTable): int {
                $updated = DB::table('chapters')
                    ->whereIn('id', DB::table($backupTable)->select('chapter_id'))
                    ->update([
                        'group_name' => null,
                        'group_heading' => null,
                    ]);

                $remaining = $this->affectedChapters()->count();

                if ($remaining !== 0) {
                    throw new RuntimeException(
                        "Verification failed: {$remaining} topic-wise chapters still contain group data.",
                    );
                }

                return $updated;
            });
        } catch (\Throwable $exception) {
            $this->error($exception->getMessage());
            $this->warn("No cleanup changes were committed. The backup remains in {$backupTable}.");

            return self::FAILURE;
        }

        $this->newLine();
        $this->info("Updated chapters: {$updated}");
        $this->info('Remaining grouped topic-wise chapters: 0');
        $this->info("Backup table: {$backupTable}");
        $this->comment('Keep the backup until you have checked the application, then drop it manually.');

        return self::SUCCESS;
    }

    private function affectedChapters(): Builder
    {
        return DB::table('chapters as c')
            ->join('subjects as s', 's.id', '=', 'c.subject_id')
            ->leftJoin('class_subjects as cs', function ($join): void {
                $join->on('cs.pattern_id', '=', 'c.pattern_id')
                    ->on('cs.class_id', '=', 'c.class_id')
                    ->on('cs.subject_id', '=', 'c.subject_id');
            })
            ->whereRaw("COALESCE(cs.subject_type, s.subject_type) = 'topic-wise'")
            ->where(function (Builder $query): void {
                $query->whereNotNull('c.group_name')
                    ->orWhereNotNull('c.group_heading');
            });
    }

    private function showSample(): void
    {
        $rows = $this->affectedChapters()
            ->leftJoin('patterns as p', 'p.id', '=', 'c.pattern_id')
            ->leftJoin('classes as cl', 'cl.id', '=', 'c.class_id')
            ->orderBy('c.id')
            ->limit(20)
            ->get([
                'c.id',
                'p.name as pattern',
                'cl.name as class',
                's.name_eng as subject',
                'c.name as chapter',
                'c.group_name',
                'c.group_heading',
            ])
            ->map(fn (object $row): array => [
                $row->id,
                $row->pattern,
                $row->class,
                $row->subject,
                $row->chapter,
                $row->group_name,
                $row->group_heading,
            ])
            ->all();

        $this->table(
            ['ID', 'Pattern', 'Class', 'Subject', 'Chapter', 'Group', 'Heading'],
            $rows,
        );

        if ($this->affectedChapters()->count() > 20) {
            $this->comment('Showing the first 20 matching chapters.');
        }
    }

    private function createBackup(int $expectedRows): string
    {
        $baseName = 'tmp_topic_wise_chapter_groups_'.now()->format('Ymd_His');
        $backupTable = $baseName;
        $suffix = 1;

        while (Schema::hasTable($backupTable)) {
            $backupTable = "{$baseName}_{$suffix}";
            $suffix++;
        }

        Schema::create($backupTable, function ($table): void {
            $table->unsignedBigInteger('chapter_id')->primary();
            $table->string('group_name', 300)->nullable();
            $table->string('group_heading', 150)->nullable();
        });

        try {
            DB::table($backupTable)->insertUsing(
                ['chapter_id', 'group_name', 'group_heading'],
                $this->affectedChapters()->select([
                    'c.id',
                    'c.group_name',
                    'c.group_heading',
                ]),
            );

            $backedUp = DB::table($backupTable)->count();

            if ($backedUp !== $expectedRows) {
                throw new RuntimeException(
                    "Backup verification failed: expected {$expectedRows} rows, copied {$backedUp}.",
                );
            }
        } catch (\Throwable $exception) {
            Schema::dropIfExists($backupTable);

            throw $exception;
        }

        $this->info("Verified backup: {$expectedRows} rows copied to {$backupTable}.");

        return $backupTable;
    }

    private function hasRequiredSchema(): bool
    {
        $requirements = [
            'chapters' => ['id', 'subject_id', 'class_id', 'pattern_id', 'group_name', 'group_heading'],
            'subjects' => ['id', 'subject_type'],
            'class_subjects' => ['subject_id', 'class_id', 'pattern_id', 'subject_type'],
        ];

        foreach ($requirements as $table => $columns) {
            if (! Schema::hasTable($table)) {
                $this->error("Required table is missing: {$table}");

                return false;
            }

            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    $this->error("Required column is missing: {$table}.{$column}");

                    return false;
                }
            }
        }

        return true;
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('trial_settings')->select('id', 'chapter_access', 'topic_access')->orderBy('id')->chunkById(100, function ($settings): void {
            foreach ($settings as $setting) {
                $changes = [];

                foreach (['chapter_access', 'topic_access'] as $field) {
                    $stored = json_decode($setting->{$field} ?? 'null', true);
                    if (! is_array($stored) || ! array_is_list($stored) || $stored === []) {
                        continue;
                    }

                    $ids = array_values(array_unique(array_map('intval', $stored)));
                    $rows = $field === 'chapter_access'
                        ? DB::table('chapters')->whereIn('id', $ids)->get(['id', 'pattern_id', 'class_id', 'subject_id'])
                        : DB::table('topics')
                            ->join('chapters', 'chapters.id', '=', 'topics.chapter_id')
                            ->whereIn('topics.id', $ids)
                            ->get(['topics.id', 'chapters.pattern_id', 'chapters.class_id', 'chapters.subject_id']);

                    $rules = [];
                    foreach ($rows as $row) {
                        $key = "{$row->pattern_id}:{$row->class_id}:{$row->subject_id}";
                        $rules[$key][] = (int) $row->id;
                    }
                    foreach ($rules as &$scopeIds) {
                        sort($scopeIds, SORT_NUMERIC);
                    }
                    unset($scopeIds);

                    $changes[$field] = json_encode($rules);
                }

                if ($changes !== []) {
                    DB::table('trial_settings')->where('id', $setting->id)->update($changes);
                }
            }
        });
    }

    public function down(): void
    {
        // Keep the subject-specific selections; reverting would discard their scopes.
    }
};

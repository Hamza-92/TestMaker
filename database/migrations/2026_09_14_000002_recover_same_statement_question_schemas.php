<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Also recover questions that may already have been reassigned before
        // per-question schemas were introduced.
        DB::table('questions')
            ->where(function ($query) {
                $query->where('content', 'like', '%"shared_en"%')
                    ->orWhere('content', 'like', '%"shared_ur"%');
            })
            ->update(['schema_key' => 'subjective_same_statement']);
    }

    public function down(): void
    {
        // Data-preservation repair: intentionally not reversed.
    }
};

<?php

use App\Support\PaperLayouts\PaperLayoutRegistry;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paper_layout_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->string('paper_layout', 50);
            $table->timestamps();

            $table->unique(['pattern_id', 'class_id']);
            $table->index('paper_layout');
        });

        $federalClassNames = ['9th', '10th', '1st Year', '2nd Year'];
        $now = now();

        DB::table('patterns')
            ->where('paper_layout', '!=', PaperLayoutRegistry::STANDARD)
            ->orderBy('id')
            ->get(['id', 'paper_layout'])
            ->each(function (object $pattern) use ($federalClassNames, $now): void {
                $classQuery = DB::table('pattern_classes')
                    ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                    ->where('pattern_classes.pattern_id', $pattern->id);

                if ($pattern->paper_layout === PaperLayoutRegistry::FEDERAL_BOARD) {
                    $classQuery->whereIn('classes.name', $federalClassNames);
                }

                $rows = $classQuery
                    ->select('pattern_classes.pattern_id', 'pattern_classes.class_id')
                    ->get()
                    ->map(fn (object $row) => [
                        'pattern_id' => $row->pattern_id,
                        'class_id' => $row->class_id,
                        'paper_layout' => $pattern->paper_layout,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])
                    ->all();

                if ($rows !== []) {
                    DB::table('paper_layout_assignments')->insert($rows);
                }
            });

        DB::table('patterns')->update(['paper_layout' => PaperLayoutRegistry::STANDARD]);
    }

    public function down(): void
    {
        DB::table('paper_layout_assignments')
            ->orderBy('pattern_id')
            ->get(['pattern_id', 'paper_layout'])
            ->groupBy('pattern_id')
            ->each(function ($assignments, $patternId): void {
                DB::table('patterns')
                    ->where('id', $patternId)
                    ->update(['paper_layout' => $assignments->first()->paper_layout]);
            });

        Schema::dropIfExists('paper_layout_assignments');
    }
};

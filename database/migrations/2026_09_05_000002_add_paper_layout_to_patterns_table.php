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
        Schema::table('patterns', function (Blueprint $table) {
            $table->string('paper_layout', 50)
                ->default(PaperLayoutRegistry::STANDARD)
                ->after('color');
            $table->index('paper_layout');
        });

        DB::table('patterns')
            ->where(function ($query): void {
                $query->whereRaw('LOWER(name) LIKE ?', ['%federal%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%fedral%'])
                    ->orWhereRaw('LOWER(COALESCE(short_name, ?)) LIKE ?', ['', '%federal%'])
                    ->orWhereRaw('LOWER(COALESCE(short_name, ?)) LIKE ?', ['', '%fedral%']);
            })
            ->update(['paper_layout' => PaperLayoutRegistry::FEDERAL_BOARD]);
    }

    public function down(): void
    {
        Schema::table('patterns', function (Blueprint $table) {
            $table->dropIndex(['paper_layout']);
            $table->dropColumn('paper_layout');
        });
    }
};

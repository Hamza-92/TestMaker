<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('announcement_dismissals', 'surface')) {
            Schema::table('announcement_dismissals', function (Blueprint $table): void {
                $table->string('surface', 20)->default('banner')->after('user_id');
            });
        }

        Schema::table('announcement_dismissals', function (Blueprint $table): void {
            $table->unique(['announcement_id', 'user_id', 'surface']);
            $table->dropUnique('announcement_dismissals_announcement_id_user_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('announcement_dismissals', function (Blueprint $table): void {
            $table->unique(['announcement_id', 'user_id']);
            $table->dropUnique('announcement_dismissals_announcement_id_user_id_surface_unique');
            $table->dropColumn('surface');
        });
    }
};

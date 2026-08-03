<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->unsignedInteger('allowed_questions')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        DB::table('subscriptions')
            ->whereNull('allowed_questions')
            ->update(['allowed_questions' => 0]);

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->unsignedInteger('allowed_questions')->nullable(false)->default(0)->change();
        });
    }
};

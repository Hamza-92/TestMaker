<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->boolean('allow_teachers')->default(false)->after('subject_access');
            $table->unsignedSmallInteger('max_teachers')->nullable()->after('allow_teachers')->comment('Null means unlimited');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['allow_teachers', 'max_teachers']);
        });
    }
};

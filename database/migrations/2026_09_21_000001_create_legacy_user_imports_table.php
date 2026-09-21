<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->unsignedInteger('remaining_questions')->nullable()->after('allowed_questions');
        });

        Schema::create('legacy_user_imports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('source_user_id')->unique();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->string('source_account_type', 30);
            $table->string('source_checksum', 64);
            $table->json('warnings')->nullable();
            $table->json('source_snapshot')->nullable();
            $table->foreignId('transferred_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transferred_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legacy_user_imports');
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('remaining_questions');
        });
    }
};

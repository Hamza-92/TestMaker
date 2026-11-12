<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The old PHP application and Laravel both use this database.
        if (app()->runningUnitTests() || Schema::connection('legacy_mysql')->hasTable('site_login_handoffs')) {
            return;
        }

        Schema::connection('legacy_mysql')->create('site_login_handoffs', function (Blueprint $table): void {
            $table->id();
            $table->char('token_hash', 64)->unique();
            $table->string('source_site', 12);
            $table->string('source_role', 12);
            $table->unsignedBigInteger('source_user_id');
            $table->string('target_role', 12)->nullable();
            $table->unsignedBigInteger('target_user_id')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamp('created_at');
            $table->index(['expires_at', 'consumed_at']);
        });
    }

    public function down(): void
    {
        // Keep outstanding handoffs intact during a code rollback. Expired rows are harmless.
    }
};

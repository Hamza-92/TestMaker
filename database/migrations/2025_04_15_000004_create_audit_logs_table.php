<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            // Polymorphic — works for User, Subscription, PaymentLog, and any future model
            $table->string('auditable_type')->index();
            $table->unsignedBigInteger('auditable_id')->index();

            $table->enum('event', ['created', 'updated', 'deleted', 'restored'])->index();

            $table->json('old_values')->nullable()->comment('Field snapshot before change');
            $table->json('new_values')->nullable()->comment('Field snapshot after change');

            $table->foreignId('changed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->string('ip_address', 45)->nullable();
            $table->text('notes')->nullable();

            // Only created_at — audit records are immutable
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

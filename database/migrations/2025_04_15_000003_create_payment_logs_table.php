<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('subscription_id')
                  ->constrained('subscriptions')
                  ->cascadeOnDelete();

            $table->decimal('amount', 10, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'online', 'cheque']);

            $table->enum('status', [
                'pending_review',
                'reviewed',
                'approved',
                'rejected',
            ])->default('pending_review')->index();

            $table->json('attachments')->nullable()->comment('Array of receipt/proof file paths');

            // Review workflow
            $table->foreignId('reviewed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable()->comment('Reviewer comments');

            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_logs');
    }
};

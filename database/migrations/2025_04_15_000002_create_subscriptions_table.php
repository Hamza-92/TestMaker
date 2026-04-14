<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->string('name');

            // Access control — arrays of allowed IDs
            $table->json('pattern_access')->nullable()->comment('Allowed paper pattern IDs');
            $table->json('class_access')->nullable()->comment('Allowed class/grade IDs');
            $table->json('subject_access')->nullable()->comment('Allowed subject IDs');

            $table->unsignedInteger('allowed_questions')->default(0);
            $table->decimal('amount', 10, 2);

            // Period
            $table->timestamp('started_at');
            $table->unsignedSmallInteger('duration')->comment('Duration in days');
            $table->timestamp('expired_at')->nullable()->comment('Can be computed: started_at + duration days');

            $table->enum('status', ['active', 'expired', 'cancelled'])->default('active')->index();

            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};

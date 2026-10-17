<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legacy_export_items', function (Blueprint $table): void {
            $table->id();
            $table->string('entity_type', 32);
            $table->unsignedBigInteger('entity_id');
            $table->unsignedBigInteger('legacy_id');
            $table->char('payload_hash', 64);
            $table->timestamps();
            $table->unique(['entity_type', 'entity_id']);
            $table->index(['entity_type', 'legacy_id']);
        });

        Schema::create('legacy_export_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('mode', 32);
            $table->unsignedBigInteger('pattern_id');
            $table->unsignedBigInteger('class_id');
            $table->unsignedBigInteger('subject_id');
            $table->json('report');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legacy_export_runs');
        Schema::dropIfExists('legacy_export_items');
    }
};

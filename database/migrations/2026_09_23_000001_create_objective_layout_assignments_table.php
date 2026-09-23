<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('objective_layout_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('objective_layout', 50)->default('standard');
            $table->boolean('show_bubbles')->default(false);
            $table->timestamps();

            $table->unique(
                ['pattern_id', 'class_id', 'subject_id'],
                'objective_layout_assignments_scope_unique',
            );
            $table->index('objective_layout');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('objective_layout_assignments');
    }
};

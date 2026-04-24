<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('name_ur', 100)->nullable();
            $table->string('heading_en', 150);
            $table->string('heading_ur', 150)->nullable();
            $table->text('description_en')->nullable();
            $table->text('description_ur')->nullable();
            $table->boolean('have_exercise')->default(false);
            $table->boolean('have_statement')->default(true);
            $table->string('statement_label', 100)->nullable();
            $table->boolean('have_description')->default(false);
            $table->string('description_label', 100)->nullable();
            $table->boolean('have_answer')->default(true);
            $table->boolean('is_single')->default(true);
            $table->boolean('is_objective')->default(false)->index();
            $table->foreignId('objective_type_id')->nullable()->constrained('question_types')->nullOnDelete();
            $table->unsignedTinyInteger('column_per_row')->default(1);
            $table->tinyInteger('status')->default(1)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_types');
    }
};

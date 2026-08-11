<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_type_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('question_type_id')->constrained('question_types')->cascadeOnDelete();
            $table->unsignedInteger('sort_order');

            $table->unique(
                ['pattern_id', 'class_id', 'subject_id', 'question_type_id'],
                'question_type_orders_scope_type_unique',
            );
            $table->index(
                ['pattern_id', 'class_id', 'subject_id', 'sort_order'],
                'question_type_orders_scope_order_index',
            );
        });

        if (Schema::hasColumn('question_types', 'sort_order')) {
            Schema::table('question_types', function (Blueprint $table) {
                $table->dropIndex(['sort_order']);
                $table->dropColumn('sort_order');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('question_type_orders');

        if (! Schema::hasColumn('question_types', 'sort_order')) {
            Schema::table('question_types', function (Blueprint $table) {
                $table->unsignedInteger('sort_order')->nullable()->after('status')->index();
            });
        }
    }
};

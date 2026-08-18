<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_type_or_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('type_signature', 255);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['pattern_id', 'class_id', 'subject_id', 'type_signature'],
                'question_type_or_groups_scope_signature_unique',
            );
            $table->index(
                ['pattern_id', 'class_id', 'subject_id', 'is_active'],
                'question_type_or_groups_scope_active_index',
            );
        });

        Schema::create('question_type_or_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')
                ->constrained('question_type_or_groups')
                ->cascadeOnDelete();
            $table->foreignId('question_type_id')
                ->constrained('question_types')
                ->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(
                ['group_id', 'question_type_id'],
                'question_type_or_group_members_group_type_unique',
            );
            $table->index(
                ['question_type_id', 'group_id'],
                'question_type_or_group_members_type_group_index',
            );
        });

        // Preserve existing binary pair IDs as group IDs so saved papers that
        // already reference an OR pairing continue to load unchanged.
        DB::table('question_type_pairings')->orderBy('id')->get()->each(function ($pairing): void {
            $typeIds = [(int) $pairing->question_type_a_id, (int) $pairing->question_type_b_id];
            sort($typeIds);

            DB::table('question_type_or_groups')->insert([
                'id' => $pairing->id,
                'pattern_id' => $pairing->pattern_id,
                'class_id' => $pairing->class_id,
                'subject_id' => $pairing->subject_id,
                'type_signature' => implode(':', $typeIds),
                'is_active' => $pairing->is_active,
                'created_by' => $pairing->created_by,
                'created_at' => $pairing->created_at,
                'updated_at' => $pairing->updated_at,
            ]);

            DB::table('question_type_or_group_members')->insert([
                [
                    'group_id' => $pairing->id,
                    'question_type_id' => $typeIds[0],
                    'sort_order' => 0,
                    'created_at' => $pairing->created_at,
                    'updated_at' => $pairing->updated_at,
                ],
                [
                    'group_id' => $pairing->id,
                    'question_type_id' => $typeIds[1],
                    'sort_order' => 1,
                    'created_at' => $pairing->created_at,
                    'updated_at' => $pairing->updated_at,
                ],
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_type_or_group_members');
        Schema::dropIfExists('question_type_or_groups');
    }
};

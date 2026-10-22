<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qat_classes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('qat_catalogue_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('source_class_id');
            $table->string('name', 150);
            $table->boolean('status')->default(true);
            $table->timestamps();
            $table->unique(['qat_catalogue_id', 'source_class_id']);
        });

        Schema::table('qat_subjects', function (Blueprint $table): void {
            $table->foreignId('qat_class_id')->nullable()->constrained('qat_classes')->nullOnDelete();
            $table->boolean('status')->default(true);
        });

        DB::table('qat_subjects')->orderBy('id')->chunkById(200, function ($subjects): void {
            foreach ($subjects as $subject) {
                DB::table('qat_classes')->insertOrIgnore([
                    'qat_catalogue_id' => $subject->qat_catalogue_id,
                    'source_class_id' => $subject->class_id,
                    'name' => $subject->class_name,
                    'status' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $qatClassId = DB::table('qat_classes')
                    ->where('qat_catalogue_id', $subject->qat_catalogue_id)
                    ->where('source_class_id', $subject->class_id)
                    ->value('id');
                DB::table('qat_subjects')->where('id', $subject->id)->update(['qat_class_id' => $qatClassId]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('qat_subjects', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('qat_class_id');
            $table->dropColumn('status');
        });
        Schema::dropIfExists('qat_classes');
    }
};

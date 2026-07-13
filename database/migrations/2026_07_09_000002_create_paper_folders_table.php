<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paper_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 20)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'name']);
        });

        Schema::table('papers', function (Blueprint $table) {
            $table->foreignId('folder_id')
                ->nullable()
                ->after('user_id')
                ->constrained('paper_folders')
                ->nullOnDelete();

            $table->index(['user_id', 'folder_id']);
        });
    }

    public function down(): void
    {
        Schema::table('papers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('folder_id');
        });

        Schema::dropIfExists('paper_folders');
    }
};

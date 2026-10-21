<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_logs', function (Blueprint $table): void {
            $table->renameColumn('customer_remarks', 'recorder_remarks');
        });
    }

    public function down(): void
    {
        Schema::table('payment_logs', function (Blueprint $table): void {
            $table->renameColumn('recorder_remarks', 'customer_remarks');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_logs', function (Blueprint $table): void {
            $table->text('customer_remarks')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('payment_logs', function (Blueprint $table): void {
            $table->dropColumn('customer_remarks');
        });
    }
};

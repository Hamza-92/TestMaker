<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_logs', function (Blueprint $table) {
            $table->unsignedInteger('commission_amount')->nullable()->after('amount');
            $table->date('next_payment_date')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('payment_logs', function (Blueprint $table) {
            $table->dropColumn(['commission_amount', 'next_payment_date']);
        });
    }
};

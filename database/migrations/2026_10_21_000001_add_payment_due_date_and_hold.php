<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->date('payment_due_date')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('payment_hold_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('payment_hold_at');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('payment_due_date');
        });
    }
};

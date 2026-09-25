<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('papers', function (Blueprint $table): void {
            $table->index(
                ['user_id', 'is_draft', 'updated_at'],
                'papers_library_list_index',
            );
        });

        Schema::table('paper_templates', function (Blueprint $table): void {
            $table->index(
                ['user_id', 'updated_at'],
                'paper_templates_library_index',
            );
        });

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->index(
                ['user_id', 'status', 'started_at'],
                'subscriptions_active_lookup_index',
            );
        });

        Schema::table('payment_logs', function (Blueprint $table): void {
            $table->index(
                ['subscription_id', 'created_at'],
                'payment_logs_subscription_order_index',
            );
        });

        Schema::table('online_tests', function (Blueprint $table): void {
            $table->index(
                ['school_id', 'created_by', 'updated_at'],
                'online_tests_school_creator_index',
            );
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->index(
                ['user_type', 'deleted_at', 'created_at'],
                'users_type_created_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex('users_type_created_index');
        });

        Schema::table('online_tests', function (Blueprint $table): void {
            $table->dropIndex('online_tests_school_creator_index');
        });

        Schema::table('payment_logs', function (Blueprint $table): void {
            $table->dropIndex('payment_logs_subscription_order_index');
        });

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropIndex('subscriptions_active_lookup_index');
        });

        Schema::table('paper_templates', function (Blueprint $table): void {
            $table->dropIndex('paper_templates_library_index');
        });

        Schema::table('papers', function (Blueprint $table): void {
            $table->dropIndex('papers_library_list_index');
        });
    }
};

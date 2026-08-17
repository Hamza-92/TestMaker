<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Customers
            ['name' => 'customers.view',   'display_name' => 'View Customers',   'group' => 'Customers'],
            ['name' => 'customers.create', 'display_name' => 'Create Customers', 'group' => 'Customers'],
            ['name' => 'customers.edit',   'display_name' => 'Edit Customers',   'group' => 'Customers'],
            ['name' => 'customers.delete', 'display_name' => 'Delete Customers', 'group' => 'Customers'],

            // Subscriptions
            ['name' => 'subscriptions.view',            'display_name' => 'View Subscriptions',    'group' => 'Subscriptions'],
            ['name' => 'subscriptions.create',          'display_name' => 'Create Subscriptions',  'group' => 'Subscriptions'],
            ['name' => 'subscriptions.edit',            'display_name' => 'Edit Subscriptions',    'group' => 'Subscriptions'],
            ['name' => 'subscriptions.manage_payments', 'display_name' => 'Manage Payments',       'group' => 'Subscriptions'],

            // Patterns
            ['name' => 'patterns.view',   'display_name' => 'View Patterns',   'group' => 'Patterns'],
            ['name' => 'patterns.create', 'display_name' => 'Create Patterns', 'group' => 'Patterns'],
            ['name' => 'patterns.edit',   'display_name' => 'Edit Patterns',   'group' => 'Patterns'],
            ['name' => 'patterns.delete', 'display_name' => 'Delete Patterns', 'group' => 'Patterns'],

            // Classes
            ['name' => 'classes.view',   'display_name' => 'View Classes',   'group' => 'Classes'],
            ['name' => 'classes.create', 'display_name' => 'Create Classes', 'group' => 'Classes'],
            ['name' => 'classes.edit',   'display_name' => 'Edit Classes',   'group' => 'Classes'],
            ['name' => 'classes.delete', 'display_name' => 'Delete Classes', 'group' => 'Classes'],

            // Subjects (includes chapters & topics)
            ['name' => 'subjects.view',   'display_name' => 'View Subjects',   'group' => 'Subjects'],
            ['name' => 'subjects.create', 'display_name' => 'Create Subjects', 'group' => 'Subjects'],
            ['name' => 'subjects.edit',   'display_name' => 'Edit Subjects',   'group' => 'Subjects'],
            ['name' => 'subjects.delete', 'display_name' => 'Delete Subjects', 'group' => 'Subjects'],

            // Question Types
            ['name' => 'question_types.view',   'display_name' => 'View Question Types',   'group' => 'Question Types'],
            ['name' => 'question_types.create', 'display_name' => 'Create Question Types', 'group' => 'Question Types'],
            ['name' => 'question_types.edit',   'display_name' => 'Edit Question Types',   'group' => 'Question Types'],
            ['name' => 'question_types.delete', 'display_name' => 'Delete Question Types', 'group' => 'Question Types'],

            // Questions
            ['name' => 'questions.view',   'display_name' => 'View Questions',   'group' => 'Questions'],
            ['name' => 'questions.create', 'display_name' => 'Create Questions', 'group' => 'Questions'],
            ['name' => 'questions.edit',   'display_name' => 'Edit Questions',   'group' => 'Questions'],
            ['name' => 'questions.delete', 'display_name' => 'Delete Questions', 'group' => 'Questions'],
            ['name' => 'questions.import', 'display_name' => 'Import Questions', 'group' => 'Questions'],

            // Users (Superadmin management)
            ['name' => 'users.view',               'display_name' => 'View Users',               'group' => 'Users'],
            ['name' => 'users.create',             'display_name' => 'Create Users',             'group' => 'Users'],
            ['name' => 'users.edit',               'display_name' => 'Edit Users',               'group' => 'Users'],
            ['name' => 'users.delete',             'display_name' => 'Delete Users',             'group' => 'Users'],
            ['name' => 'users.manage_permissions', 'display_name' => 'Manage User Permissions',  'group' => 'Users'],

            // Trial Settings
            ['name' => 'trial_settings.edit', 'display_name' => 'Manage Trial Settings', 'group' => 'Trial Settings'],

            // Announcements
            ['name' => 'announcements.view',   'display_name' => 'View Announcements',   'group' => 'Announcements'],
            ['name' => 'announcements.create', 'display_name' => 'Create Announcements', 'group' => 'Announcements'],
            ['name' => 'announcements.edit',   'display_name' => 'Edit Announcements',   'group' => 'Announcements'],
            ['name' => 'announcements.delete', 'display_name' => 'Delete Announcements', 'group' => 'Announcements'],
        ];

        foreach ($permissions as $data) {
            Permission::firstOrCreate(['name' => $data['name']], $data);
        }
    }
}

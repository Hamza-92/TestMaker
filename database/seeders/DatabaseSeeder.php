<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Enums\UserStatus;
use App\Enums\UserType;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            MediumSeeder::class,
            PermissionSeeder::class,
        ]);
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@testmaker.com',
            'user_type' => UserType::SuperAdmin,
            'status' => UserStatus::Active,
            'created_by' => null,
        ]);
    }
}

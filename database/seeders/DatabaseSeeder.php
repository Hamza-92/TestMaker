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

        User::firstOrCreate(
            ['email' => 'admin@testmaker.com'],
            [
                'name' => 'Super Admin',
                'password' => bcrypt('11111111'),
                'user_type' => UserType::SuperAdmin->value,
                'status' => UserStatus::Active->value,
                'email_verified_at' => now(),
                'created_by' => null,
            ]
        );
    }
}

<?php

namespace Database\Seeders;

use App\Models\Medium;
use Illuminate\Database\Seeder;

class MediumSeeder extends Seeder
{
    public function run(): void
    {
        $mediums = ['English', 'Urdu', 'Both'];

        foreach ($mediums as $name) {
            Medium::firstOrCreate(['name' => $name]);
        }
    }
}

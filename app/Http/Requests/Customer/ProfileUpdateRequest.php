<?php

namespace App\Http\Requests\Customer;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        $schoolFieldRules = $this->user()->isCustomer()
            ? ['required', 'string']
            : ['nullable', 'string'];

        return array_merge($this->profileRules($this->user()->id), [
            'phone' => [$this->user()->isCustomer() ? 'required' : 'nullable', 'string', 'max:30', 'regex:/^[0-9+()\-\s]{7,30}$/'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
            'remove_logo' => ['boolean'],
            'school_name' => [...$schoolFieldRules, 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => [...$schoolFieldRules, 'max:100'],
            'province' => [...$schoolFieldRules, 'max:100'],
        ]);
    }
}

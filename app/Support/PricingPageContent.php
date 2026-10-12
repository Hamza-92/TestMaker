<?php

namespace App\Support;

use App\Models\SitePage;
use Illuminate\Validation\Rule;

class PricingPageContent
{
    public static function defaults(): array
    {
        return [
            'seo' => [
                'title' => 'Pricing | TestMaker',
                'description' => 'Explore TestMaker plans for schools and start with a free trial.',
            ],
            'hero' => [
                'eyebrow' => 'Simple, transparent plans',
                'title' => 'Choose the right plan for your school.',
                'description' => 'Start free, then choose the package that fits your classes and the way your school works.',
            ],
            'layout' => [
                'hero_alignment' => 'center',
                'hero_background' => 'soft',
                'plan_columns' => 3,
                'card_style' => 'outline',
            ],
            'section_order' => ['plans', 'benefits', 'faq', 'cta'],
            'visibility' => ['plans' => true, 'benefits' => true, 'faq' => false, 'cta' => true],
            'plans_section' => [
                'eyebrow' => 'For every stage',
                'title' => 'Plans that fit your school',
                'description' => 'Pick a starting point. Our team can help you choose the right scope.',
                'additional_title' => 'More ways to use TestMaker',
            ],
            'plans' => [
                [
                    'id' => 'trial', 'group' => 'main', 'visible' => true, 'featured' => true,
                    'eyebrow' => 'Try TestMaker first', 'name' => '30-Day Free Trial',
                    'price' => '30 days', 'period' => '',
                    'description' => 'Explore the assessment workflow with no payment required.',
                    'features' => ['Full paper builder', 'Core question types', 'No commitment', 'Download and print papers'],
                    'badge' => 'Start here', 'action_label' => 'Start free trial', 'action_url' => '/register',
                ],
                [
                    'id' => 'junior', 'group' => 'main', 'visible' => true, 'featured' => false,
                    'eyebrow' => 'Junior school package', 'name' => 'Play Group to 8th',
                    'price' => 'Rs 9,000', 'period' => '/ year',
                    'description' => 'A practical package for schools building consistent papers across junior classes.',
                    'features' => ['1-year access', 'Unlimited printouts', 'Shared school workflow', 'Classes Play Group to 8th'],
                    'badge' => '', 'action_label' => 'Get started', 'action_url' => '/register',
                ],
                [
                    'id' => 'full-school', 'group' => 'main', 'visible' => true, 'featured' => false,
                    'eyebrow' => 'Full-school package', 'name' => 'Play to 12th',
                    'price' => 'Rs 12,000', 'period' => '/ year',
                    'description' => 'A complete package for schools supporting learners through higher classes.',
                    'features' => ['1-year access', 'Unlimited printouts', 'Broad class coverage', 'Classes Play Group to 12th'],
                    'badge' => '', 'action_label' => 'Get started', 'action_url' => '/register',
                ],
                [
                    'id' => 'online', 'group' => 'additional', 'visible' => true, 'featured' => false,
                    'eyebrow' => 'Digital testing', 'name' => 'Online Assessment',
                    'price' => 'Talk to us', 'period' => '',
                    'description' => 'Add online tests and digital delivery when your school is ready.',
                    'features' => ['Online MCQ tests', 'Shareable test links', 'Student attempts', 'Results overview'],
                    'badge' => '', 'action_label' => 'Ask about online tests', 'action_url' => '/register',
                ],
                [
                    'id' => 'plus', 'group' => 'additional', 'visible' => true, 'featured' => false,
                    'eyebrow' => 'Growing teams', 'name' => 'School Plus',
                    'price' => 'Talk to us', 'period' => '',
                    'description' => 'More collaboration, support, or tailored access for your school.',
                    'features' => ['Multiple teacher accounts', 'School-wide standards', 'Priority onboarding', 'Flexible permissions'],
                    'badge' => '', 'action_label' => 'Talk to our team', 'action_url' => '/register',
                ],
                [
                    'id' => 'custom', 'group' => 'additional', 'visible' => true, 'featured' => false,
                    'eyebrow' => 'Institutions', 'name' => 'Custom Partnership',
                    'price' => 'Let’s plan it', 'period' => '',
                    'description' => 'Build an assessment workflow around your institution or network.',
                    'features' => ['Custom requirements review', 'Implementation guidance', 'Usage planning', 'Dedicated support'],
                    'badge' => '', 'action_label' => 'Start a conversation', 'action_url' => '/register',
                ],
            ],
            'benefits' => [
                'title' => 'A straightforward way to get started',
                'items' => [
                    ['title' => 'Try it first', 'description' => 'Explore the paper workflow before choosing a package.'],
                    ['title' => 'Built for schools', 'description' => 'Keep teachers and coordinators aligned.'],
                    ['title' => 'Need a hand?', 'description' => 'Our team can help you choose a practical setup.'],
                ],
            ],
            'faq' => ['title' => 'Frequently asked questions', 'items' => []],
            'cta' => [
                'eyebrow' => 'Ready to begin?',
                'title' => 'Make your next assessment easier to build.',
                'description' => 'Create your school account and explore TestMaker.',
                'button_label' => 'Start for free',
                'button_url' => '/register',
            ],
        ];
    }

    public static function published(): array
    {
        return SitePage::query()->where('slug', 'pricing')->first()?->published_content ?? self::defaults();
    }

    public static function page(): SitePage
    {
        return SitePage::query()->firstOrCreate(
            ['slug' => 'pricing'],
            [
                'template' => 'pricing',
                'draft_content' => self::defaults(),
                'published_content' => self::defaults(),
                'published_at' => now(),
            ],
        );
    }

    public static function rules(): array
    {
        $url = ['required', 'string', 'max:500', 'regex:~^(?:/(?!/)[^\s]*|https://[^\s]+|mailto:[^\s]+|tel:\+?[0-9 -]+)$~i'];

        return [
            'content' => ['required', 'array:seo,hero,layout,section_order,visibility,plans_section,plans,benefits,faq,cta'],
            'content.seo' => ['required', 'array:title,description'],
            'content.seo.title' => ['required', 'string', 'max:90'],
            'content.seo.description' => ['required', 'string', 'max:180'],
            'content.hero' => ['required', 'array:eyebrow,title,description'],
            'content.hero.eyebrow' => ['required', 'string', 'max:90'],
            'content.hero.title' => ['required', 'string', 'max:140'],
            'content.hero.description' => ['required', 'string', 'max:350'],
            'content.layout' => ['required', 'array:hero_alignment,hero_background,plan_columns,card_style'],
            'content.layout.hero_alignment' => ['required', Rule::in(['center', 'left'])],
            'content.layout.hero_background' => ['required', Rule::in(['soft', 'plain'])],
            'content.layout.plan_columns' => ['required', 'integer', Rule::in([2, 3, 4])],
            'content.layout.card_style' => ['required', Rule::in(['outline', 'soft'])],
            'content.section_order' => ['required', 'array', 'size:4'],
            'content.section_order.*' => ['required', Rule::in(['plans', 'benefits', 'faq', 'cta']), 'distinct'],
            'content.visibility' => ['required', 'array:plans,benefits,faq,cta'],
            'content.visibility.plans' => ['required', 'boolean'],
            'content.visibility.benefits' => ['required', 'boolean'],
            'content.visibility.faq' => ['required', 'boolean'],
            'content.visibility.cta' => ['required', 'boolean'],
            'content.plans_section' => ['required', 'array:eyebrow,title,description,additional_title'],
            'content.plans_section.eyebrow' => ['required', 'string', 'max:90'],
            'content.plans_section.title' => ['required', 'string', 'max:140'],
            'content.plans_section.description' => ['required', 'string', 'max:350'],
            'content.plans_section.additional_title' => ['required', 'string', 'max:140'],
            'content.plans' => ['required', 'array', 'min:1', 'max:24'],
            'content.plans.*' => ['required', 'array:id,group,visible,featured,eyebrow,name,price,period,description,features,badge,action_label,action_url'],
            'content.plans.*.id' => ['required', 'string', 'max:80', 'regex:/^[a-zA-Z0-9_-]+$/', 'distinct'],
            'content.plans.*.group' => ['required', Rule::in(['main', 'additional'])],
            'content.plans.*.visible' => ['required', 'boolean'],
            'content.plans.*.featured' => ['required', 'boolean'],
            'content.plans.*.eyebrow' => ['required', 'string', 'max:90'],
            'content.plans.*.name' => ['required', 'string', 'max:100'],
            'content.plans.*.price' => ['required', 'string', 'max:80'],
            'content.plans.*.period' => ['present', 'nullable', 'string', 'max:60'],
            'content.plans.*.description' => ['required', 'string', 'max:350'],
            'content.plans.*.features' => ['required', 'array', 'min:1', 'max:12'],
            'content.plans.*.features.*' => ['required', 'string', 'max:130'],
            'content.plans.*.badge' => ['present', 'nullable', 'string', 'max:60'],
            'content.plans.*.action_label' => ['required', 'string', 'max:80'],
            'content.plans.*.action_url' => $url,
            'content.benefits' => ['required', 'array:title,items'],
            'content.benefits.title' => ['required', 'string', 'max:140'],
            'content.benefits.items' => ['present', 'array', 'max:6'],
            'content.benefits.items.*' => ['required', 'array:title,description'],
            'content.benefits.items.*.title' => ['required', 'string', 'max:100'],
            'content.benefits.items.*.description' => ['required', 'string', 'max:250'],
            'content.faq' => ['required', 'array:title,items'],
            'content.faq.title' => ['required', 'string', 'max:140'],
            'content.faq.items' => ['present', 'array', 'max:12'],
            'content.faq.items.*' => ['required', 'array:question,answer'],
            'content.faq.items.*.question' => ['required', 'string', 'max:180'],
            'content.faq.items.*.answer' => ['required', 'string', 'max:800'],
            'content.cta' => ['required', 'array:eyebrow,title,description,button_label,button_url'],
            'content.cta.eyebrow' => ['required', 'string', 'max:90'],
            'content.cta.title' => ['required', 'string', 'max:140'],
            'content.cta.description' => ['required', 'string', 'max:350'],
            'content.cta.button_label' => ['required', 'string', 'max:80'],
            'content.cta.button_url' => $url,
        ];
    }
}

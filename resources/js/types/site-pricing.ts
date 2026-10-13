export interface PricingPlan {
    id: string;
    group: 'main' | 'additional';
    visible: boolean;
    featured: boolean;
    eyebrow: string;
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    badge: string;
    action_label: string;
    action_url: string;
}

export type PricingSection = 'plans' | 'benefits' | 'faq' | 'cta';

export interface PricingContent {
    seo: { title: string; description: string };
    hero: { eyebrow: string; title: string; description: string };
    layout: {
        hero_alignment: 'center' | 'left';
        hero_background: 'soft' | 'plain';
        plan_columns: 2 | 3 | 4;
        card_style: 'outline' | 'soft';
    };
    section_order: PricingSection[];
    visibility: Record<PricingSection, boolean>;
    plans_section: {
        eyebrow: string;
        title: string;
        description: string;
        additional_title: string;
    };
    plans: PricingPlan[];
    benefits: {
        title: string;
        items: Array<{ title: string; description: string }>;
    };
    faq: { title: string; items: Array<{ question: string; answer: string }> };
    cta: {
        eyebrow: string;
        title: string;
        description: string;
        button_label: string;
        button_url: string;
    };
}

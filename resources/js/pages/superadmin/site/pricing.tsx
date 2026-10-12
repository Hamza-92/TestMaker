import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Eye,
    Plus,
    RotateCcw,
    Save,
    Send,
    Trash2,
} from 'lucide-react';
import { useId, useState } from 'react';
import { Button, Card, PageHeader } from '@/components/tm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
    PricingContent,
    PricingPlan,
    PricingSection,
} from '@/types/site-pricing';

interface Props {
    content: PricingContent;
    version: number;
    publishedAt: string | null;
    revisions: Array<{ id: number; number: number; created_at: string }>;
    canEdit: boolean;
}

const sectionNames: Record<PricingSection, string> = {
    plans: 'Plans',
    benefits: 'Benefits',
    faq: 'Questions & answers',
    cta: 'Final call to action',
};

function TextField({
    label,
    value,
    onChange,
    multiline = false,
    disabled = false,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    disabled?: boolean;
    placeholder?: string;
}) {
    const id = useId();

    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            {multiline ? (
                <textarea
                    id={id}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    placeholder={placeholder}
                    rows={3}
                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                />
            ) : (
                <Input
                    id={id}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    placeholder={placeholder}
                />
            )}
        </div>
    );
}

function Choice({
    label,
    value,
    options,
    onChange,
    disabled,
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
    disabled: boolean;
}) {
    const id = useId();

    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Select value={value} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger id={id}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export default function SitePricingEditor({
    content: initialContent,
    version,
    publishedAt,
    revisions,
    canEdit,
}: Props) {
    const [content, setContent] = useState<PricingContent>(initialContent);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const dirty = JSON.stringify(content) !== JSON.stringify(initialContent);

    function patchGroup<
        K extends
            | 'seo'
            | 'hero'
            | 'layout'
            | 'plans_section'
            | 'benefits'
            | 'faq'
            | 'cta',
    >(key: K, patch: Partial<PricingContent[K]>) {
        setContent((current) => ({
            ...current,
            [key]: { ...current[key], ...patch },
        }));
    }

    function patchPlan(id: string, patch: Partial<PricingPlan>) {
        setContent((current) => ({
            ...current,
            plans: current.plans.map((plan) =>
                plan.id === id ? { ...plan, ...patch } : plan,
            ),
        }));
    }

    function movePlan(index: number, direction: -1 | 1) {
        setContent((current) => {
            const plans = [...current.plans];
            const nextIndex = index + direction;

            if (nextIndex < 0 || nextIndex >= plans.length) {
                return current;
            }

            [plans[index], plans[nextIndex]] = [plans[nextIndex], plans[index]];

            return { ...current, plans };
        });
    }

    function moveSection(index: number, direction: -1 | 1) {
        setContent((current) => {
            const section_order = [...current.section_order];
            const nextIndex = index + direction;

            if (nextIndex < 0 || nextIndex >= section_order.length) {
                return current;
            }

            [section_order[index], section_order[nextIndex]] = [
                section_order[nextIndex],
                section_order[index],
            ];

            return { ...current, section_order };
        });
    }

    function save(publish: boolean) {
        if (!canEdit || processing) {
            return;
        }

        setProcessing(true);
        setErrors({});
        router.put(
            '/superadmin/site/pricing',
            {
                version,
                publish,
                content: content as unknown as FormDataConvertible,
            },
            {
                preserveState: 'errors',
                onError: (nextErrors) => setErrors(nextErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function restore(revisionId: number) {
        if (
            !canEdit ||
            processing ||
            !window.confirm(
                'Restore this revision to the draft? Unpublished changes will be replaced.',
            )
        ) {
            return;
        }

        setProcessing(true);
        router.post(
            `/superadmin/site/pricing/revisions/${revisionId}/restore`,
            { version },
            {
                preserveState: 'errors',
                onError: (nextErrors) => setErrors(nextErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    const locked = !canEdit || processing;

    return (
        <>
            <Head title="Pricing · Public Website" />
            <div className="space-y-6 p-4 pb-28 md:p-6">
                <PageHeader
                    title="Pricing page"
                    meta={
                        publishedAt
                            ? `Published ${new Date(publishedAt).toLocaleString()}`
                            : 'Not yet published'
                    }
                    actions={
                        <>
                            <Button asChild variant="secondary">
                                <Link
                                    href="/superadmin/site/pricing/preview"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Eye />
                                    Preview saved draft
                                </Link>
                            </Button>
                            <Button asChild variant="secondary">
                                <Link
                                    href="/pricing"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Live page
                                </Link>
                            </Button>
                        </>
                    }
                />
                {dirty && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        You have unsaved changes. Save the draft before opening
                        its preview.
                    </p>
                )}
                {Object.keys(errors).length > 0 && (
                    <div
                        role="alert"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                    >
                        <p className="font-semibold">
                            Please fix these fields before saving.
                        </p>
                        <ul className="mt-2 list-disc pl-5">
                            {Object.entries(errors)
                                .slice(0, 8)
                                .map(([field, message]) => (
                                    <li key={field}>{message}</li>
                                ))}
                        </ul>
                    </div>
                )}

                <fieldset disabled={locked} className="space-y-6">
                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold">Page heading</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                                label="Eyebrow"
                                value={content.hero.eyebrow}
                                onChange={(value) =>
                                    patchGroup('hero', { eyebrow: value })
                                }
                            />
                            <TextField
                                label="Headline"
                                value={content.hero.title}
                                onChange={(value) =>
                                    patchGroup('hero', { title: value })
                                }
                            />
                        </div>
                        <TextField
                            label="Introduction"
                            value={content.hero.description}
                            onChange={(value) =>
                                patchGroup('hero', { description: value })
                            }
                            multiline
                        />
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Choice
                                label="Heading alignment"
                                value={content.layout.hero_alignment}
                                options={[
                                    { value: 'center', label: 'Centered' },
                                    { value: 'left', label: 'Left aligned' },
                                ]}
                                onChange={(value) =>
                                    patchGroup('layout', {
                                        hero_alignment:
                                            value as PricingContent['layout']['hero_alignment'],
                                    })
                                }
                                disabled={locked}
                            />
                            <Choice
                                label="Heading background"
                                value={content.layout.hero_background}
                                options={[
                                    { value: 'soft', label: 'Soft gray' },
                                    { value: 'plain', label: 'White' },
                                ]}
                                onChange={(value) =>
                                    patchGroup('layout', {
                                        hero_background:
                                            value as PricingContent['layout']['hero_background'],
                                    })
                                }
                                disabled={locked}
                            />
                            <Choice
                                label="Card columns"
                                value={String(content.layout.plan_columns)}
                                options={[2, 3, 4].map((value) => ({
                                    value: String(value),
                                    label: `${value} columns`,
                                }))}
                                onChange={(value) =>
                                    patchGroup('layout', {
                                        plan_columns: Number(
                                            value,
                                        ) as PricingContent['layout']['plan_columns'],
                                    })
                                }
                                disabled={locked}
                            />
                            <Choice
                                label="Card style"
                                value={content.layout.card_style}
                                options={[
                                    { value: 'outline', label: 'Outlined' },
                                    { value: 'soft', label: 'Soft background' },
                                ]}
                                onChange={(value) =>
                                    patchGroup('layout', {
                                        card_style:
                                            value as PricingContent['layout']['card_style'],
                                    })
                                }
                                disabled={locked}
                            />
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Section order and visibility
                        </h2>
                        <div className="space-y-2">
                            {content.section_order.map((section, index) => (
                                <div
                                    key={section}
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
                                >
                                    <span className="flex-1 text-sm font-medium">
                                        {sectionNames[section]}
                                    </span>
                                    <Switch
                                        checked={content.visibility[section]}
                                        onCheckedChange={(checked) =>
                                            setContent((current) => ({
                                                ...current,
                                                visibility: {
                                                    ...current.visibility,
                                                    [section]: checked,
                                                },
                                            }))
                                        }
                                        disabled={locked}
                                        aria-label={`Show ${sectionNames[section]}`}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={locked || index === 0}
                                        onClick={() => moveSection(index, -1)}
                                        aria-label={`Move ${sectionNames[section]} up`}
                                    >
                                        <ArrowUp />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={
                                            locked ||
                                            index ===
                                                content.section_order.length - 1
                                        }
                                        onClick={() => moveSection(index, 1)}
                                        aria-label={`Move ${sectionNames[section]} down`}
                                    >
                                        <ArrowDown />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold">Plans section</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                                label="Eyebrow"
                                value={content.plans_section.eyebrow}
                                onChange={(value) =>
                                    patchGroup('plans_section', {
                                        eyebrow: value,
                                    })
                                }
                            />
                            <TextField
                                label="Section title"
                                value={content.plans_section.title}
                                onChange={(value) =>
                                    patchGroup('plans_section', {
                                        title: value,
                                    })
                                }
                            />
                        </div>
                        <TextField
                            label="Description"
                            value={content.plans_section.description}
                            onChange={(value) =>
                                patchGroup('plans_section', {
                                    description: value,
                                })
                            }
                            multiline
                        />
                        <TextField
                            label="Additional plans heading"
                            value={content.plans_section.additional_title}
                            onChange={(value) =>
                                patchGroup('plans_section', {
                                    additional_title: value,
                                })
                            }
                        />
                    </Card>

                    <Card className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Plan cards
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Order here controls the public page and
                                    homepage preview.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={locked || content.plans.length >= 24}
                                onClick={() =>
                                    setContent((current) => ({
                                        ...current,
                                        plans: [
                                            ...current.plans,
                                            {
                                                id: `plan-${crypto.randomUUID()}`,
                                                group: 'main',
                                                visible: true,
                                                featured: false,
                                                eyebrow: 'School package',
                                                name: 'New plan',
                                                price: 'Talk to us',
                                                period: '',
                                                description:
                                                    'Describe this plan.',
                                                features: ['First benefit'],
                                                badge: '',
                                                action_label: 'Get started',
                                                action_url: '/register',
                                            },
                                        ],
                                    }))
                                }
                            >
                                <Plus />
                                Add plan
                            </Button>
                        </div>
                        <div className="space-y-5">
                            {content.plans.map((plan, index) => (
                                <div
                                    key={plan.id}
                                    className="space-y-4 rounded-xl border border-slate-200 p-4"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="mr-auto font-semibold">
                                            {plan.name || `Plan ${index + 1}`}
                                        </h3>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={locked || index === 0}
                                            onClick={() => movePlan(index, -1)}
                                            aria-label="Move plan up"
                                        >
                                            <ArrowUp />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={
                                                locked ||
                                                index ===
                                                    content.plans.length - 1
                                            }
                                            onClick={() => movePlan(index, 1)}
                                            aria-label="Move plan down"
                                        >
                                            <ArrowDown />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={
                                                locked ||
                                                content.plans.length === 1
                                            }
                                            onClick={() =>
                                                setContent((current) => ({
                                                    ...current,
                                                    plans: current.plans.filter(
                                                        (item) =>
                                                            item.id !== plan.id,
                                                    ),
                                                }))
                                            }
                                            aria-label="Delete plan"
                                            className="text-rose-600"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <TextField
                                            label="Name"
                                            value={plan.name}
                                            onChange={(value) =>
                                                patchPlan(plan.id, {
                                                    name: value,
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Eyebrow"
                                            value={plan.eyebrow}
                                            onChange={(value) =>
                                                patchPlan(plan.id, {
                                                    eyebrow: value,
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Price or price label"
                                            value={plan.price}
                                            onChange={(value) =>
                                                patchPlan(plan.id, {
                                                    price: value,
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Period"
                                            value={plan.period}
                                            onChange={(value) =>
                                                patchPlan(plan.id, {
                                                    period: value,
                                                })
                                            }
                                            placeholder="/ year"
                                        />
                                    </div>
                                    <TextField
                                        label="Description"
                                        value={plan.description}
                                        onChange={(value) =>
                                            patchPlan(plan.id, {
                                                description: value,
                                            })
                                        }
                                        multiline
                                    />
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <TextField
                                            label="Badge (optional)"
                                            value={plan.badge}
                                            onChange={(value) =>
                                                patchPlan(plan.id, {
                                                    badge: value,
                                                })
                                            }
                                        />
                                        <Choice
                                            label="Placement"
                                            value={plan.group}
                                            options={[
                                                {
                                                    value: 'main',
                                                    label: 'Main cards',
                                                },
                                                {
                                                    value: 'additional',
                                                    label: 'Additional plans',
                                                },
                                            ]}
                                            onChange={(value) =>
                                                patchPlan(plan.id, {
                                                    group: value as PricingPlan['group'],
                                                })
                                            }
                                            disabled={locked}
                                        />
                                        <div className="flex items-end gap-3 pb-2">
                                            <Switch
                                                checked={plan.visible}
                                                onCheckedChange={(value) =>
                                                    patchPlan(plan.id, {
                                                        visible: value,
                                                    })
                                                }
                                                disabled={locked}
                                            />
                                            <Label>Visible</Label>
                                        </div>
                                        <div className="flex items-end gap-3 pb-2">
                                            <Switch
                                                checked={plan.featured}
                                                onCheckedChange={(value) =>
                                                    patchPlan(plan.id, {
                                                        featured: value,
                                                    })
                                                }
                                                disabled={locked}
                                            />
                                            <Label>Highlighted</Label>
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <TextField
                                            label="Button text"
                                            value={plan.action_label}
                                            onChange={(value) =>
                                                patchPlan(plan.id, {
                                                    action_label: value,
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Button link"
                                            value={plan.action_url}
                                            onChange={(value) =>
                                                patchPlan(plan.id, {
                                                    action_url: value,
                                                })
                                            }
                                            placeholder="/register"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Included features</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    locked ||
                                                    plan.features.length >= 12
                                                }
                                                onClick={() =>
                                                    patchPlan(plan.id, {
                                                        features: [
                                                            ...plan.features,
                                                            '',
                                                        ],
                                                    })
                                                }
                                            >
                                                <Plus />
                                                Add feature
                                            </Button>
                                        </div>
                                        {plan.features.map(
                                            (feature, featureIndex) => (
                                                <div
                                                    key={featureIndex}
                                                    className="flex gap-2"
                                                >
                                                    <Input
                                                        value={feature}
                                                        onChange={(event) =>
                                                            patchPlan(plan.id, {
                                                                features:
                                                                    plan.features.map(
                                                                        (
                                                                            item,
                                                                            itemIndex,
                                                                        ) =>
                                                                            itemIndex ===
                                                                            featureIndex
                                                                                ? event
                                                                                      .target
                                                                                      .value
                                                                                : item,
                                                                    ),
                                                            })
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        disabled={
                                                            locked ||
                                                            plan.features
                                                                .length === 1
                                                        }
                                                        onClick={() =>
                                                            patchPlan(plan.id, {
                                                                features:
                                                                    plan.features.filter(
                                                                        (
                                                                            _,
                                                                            itemIndex,
                                                                        ) =>
                                                                            itemIndex !==
                                                                            featureIndex,
                                                                    ),
                                                            })
                                                        }
                                                        aria-label="Remove feature"
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold">Benefits</h2>
                        <TextField
                            label="Section title"
                            value={content.benefits.title}
                            onChange={(value) =>
                                patchGroup('benefits', { title: value })
                            }
                        />
                        {content.benefits.items.map((item, index) => (
                            <div
                                key={index}
                                className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_2fr_auto]"
                            >
                                <TextField
                                    label="Title"
                                    value={item.title}
                                    onChange={(value) =>
                                        patchGroup('benefits', {
                                            items: content.benefits.items.map(
                                                (entry, itemIndex) =>
                                                    itemIndex === index
                                                        ? {
                                                              ...entry,
                                                              title: value,
                                                          }
                                                        : entry,
                                            ),
                                        })
                                    }
                                />
                                <TextField
                                    label="Description"
                                    value={item.description}
                                    onChange={(value) =>
                                        patchGroup('benefits', {
                                            items: content.benefits.items.map(
                                                (entry, itemIndex) =>
                                                    itemIndex === index
                                                        ? {
                                                              ...entry,
                                                              description:
                                                                  value,
                                                          }
                                                        : entry,
                                            ),
                                        })
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="self-end text-rose-600"
                                    onClick={() =>
                                        patchGroup('benefits', {
                                            items: content.benefits.items.filter(
                                                (_, itemIndex) =>
                                                    itemIndex !== index,
                                            ),
                                        })
                                    }
                                    aria-label="Remove benefit"
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={
                                locked || content.benefits.items.length >= 6
                            }
                            onClick={() =>
                                patchGroup('benefits', {
                                    items: [
                                        ...content.benefits.items,
                                        { title: '', description: '' },
                                    ],
                                })
                            }
                        >
                            <Plus />
                            Add benefit
                        </Button>
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Questions & answers
                        </h2>
                        <TextField
                            label="Section title"
                            value={content.faq.title}
                            onChange={(value) =>
                                patchGroup('faq', { title: value })
                            }
                        />
                        {content.faq.items.map((item, index) => (
                            <div
                                key={index}
                                className="space-y-3 rounded-lg border border-slate-200 p-3"
                            >
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <TextField
                                            label="Question"
                                            value={item.question}
                                            onChange={(value) =>
                                                patchGroup('faq', {
                                                    items: content.faq.items.map(
                                                        (entry, itemIndex) =>
                                                            itemIndex === index
                                                                ? {
                                                                      ...entry,
                                                                      question:
                                                                          value,
                                                                  }
                                                                : entry,
                                                    ),
                                                })
                                            }
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="mt-5 text-rose-600"
                                        onClick={() =>
                                            patchGroup('faq', {
                                                items: content.faq.items.filter(
                                                    (_, itemIndex) =>
                                                        itemIndex !== index,
                                                ),
                                            })
                                        }
                                        aria-label="Remove question"
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                                <TextField
                                    label="Answer"
                                    value={item.answer}
                                    onChange={(value) =>
                                        patchGroup('faq', {
                                            items: content.faq.items.map(
                                                (entry, itemIndex) =>
                                                    itemIndex === index
                                                        ? {
                                                              ...entry,
                                                              answer: value,
                                                          }
                                                        : entry,
                                            ),
                                        })
                                    }
                                    multiline
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={locked || content.faq.items.length >= 12}
                            onClick={() =>
                                patchGroup('faq', {
                                    items: [
                                        ...content.faq.items,
                                        { question: '', answer: '' },
                                    ],
                                })
                            }
                        >
                            <Plus />
                            Add question
                        </Button>
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Final call to action
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                                label="Eyebrow"
                                value={content.cta.eyebrow}
                                onChange={(value) =>
                                    patchGroup('cta', { eyebrow: value })
                                }
                            />
                            <TextField
                                label="Headline"
                                value={content.cta.title}
                                onChange={(value) =>
                                    patchGroup('cta', { title: value })
                                }
                            />
                        </div>
                        <TextField
                            label="Description"
                            value={content.cta.description}
                            onChange={(value) =>
                                patchGroup('cta', { description: value })
                            }
                            multiline
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                                label="Button text"
                                value={content.cta.button_label}
                                onChange={(value) =>
                                    patchGroup('cta', { button_label: value })
                                }
                            />
                            <TextField
                                label="Button link"
                                value={content.cta.button_url}
                                onChange={(value) =>
                                    patchGroup('cta', { button_url: value })
                                }
                            />
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Search listing
                        </h2>
                        <TextField
                            label="Page title"
                            value={content.seo.title}
                            onChange={(value) =>
                                patchGroup('seo', { title: value })
                            }
                        />
                        <TextField
                            label="Page description"
                            value={content.seo.description}
                            onChange={(value) =>
                                patchGroup('seo', { description: value })
                            }
                            multiline
                        />
                    </Card>
                </fieldset>

                <Card className="space-y-3">
                    <h2 className="text-lg font-semibold">
                        Published versions
                    </h2>
                    {revisions.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            Versions appear here after publishing.
                        </p>
                    ) : (
                        revisions.map((revision) => (
                            <div
                                key={revision.id}
                                className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-2 text-sm"
                            >
                                <span>
                                    Version {revision.number} ·{' '}
                                    {new Date(
                                        revision.created_at,
                                    ).toLocaleString()}
                                </span>
                                {canEdit && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={processing}
                                        onClick={() => restore(revision.id)}
                                    >
                                        <RotateCcw />
                                        Restore to draft
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </Card>

                {canEdit && (
                    <div className="sticky bottom-4 z-20 flex flex-wrap justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={processing}
                            onClick={() => save(false)}
                        >
                            <Save />
                            Save draft
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            disabled={processing}
                            onClick={() => save(true)}
                        >
                            <Send />
                            Publish page
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

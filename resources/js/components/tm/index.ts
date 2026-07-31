/**
 * TestMaker component kit — the customer app's own components.
 *
 * Separate from `components/ui/*` (the Laravel/shadcn scaffold) because
 * those are still used by auth, settings and superadmin; replacing them
 * in place would break those sides.
 *
 * ── Design rules ────────────────────────────────────────────────────
 *
 * 1. Solid fills only. No gradients.
 *
 * 2. Colour carries meaning, never decoration:
 *      blue     primary action, active state, links   (--color-brand-*)
 *      emerald  saved / published / success
 *      amber    draft / pending
 *      rose     destructive
 *      violet   templates
 *      slate    everything neutral
 *
 * 3. Cut text that restates its own label or icon. Keep text that tells
 *    you something you would otherwise have to click to find out.
 *
 * 4. Page content is full width. Only modals and prose get a max-width.
 *
 * 5. Every inline control is CONTROL_H tall, so tabs, inputs and buttons
 *    standing next to each other always line up.
 */
export { Button, buttonVariants } from './button';
export { Card, cardVariants } from './card';
export { Badge, badgeVariants } from './badge';
export { EmptyState } from './empty-state';
export { PageHeader } from './page-header';
export { Input, SearchInput, CONTROL_H } from './input';
export { Tabs, type TabItem } from './tabs';
export { Checkbox } from './checkbox';
export { Pagination, type PageMeta } from './pagination';
export { SelectionBar } from './selection-bar';
export { notify, type ToastTone, type ToastOptions } from './toast';

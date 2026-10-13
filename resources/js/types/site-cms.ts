export type SiteMenuKey = 'header' | 'footer';

export interface SiteMenuItem {
    id: string;
    label: string;
    type: 'url' | 'page';
    url: string | null;
    page_id: number | null;
    visible: boolean;
    children: SiteMenuItem[];
}

export interface PublicMenuItem {
    id: string;
    label: string;
    href: string;
    children: Omit<PublicMenuItem, 'children'>[];
}

export interface SiteNavigation {
    header: PublicMenuItem[];
    footer: PublicMenuItem[];
}

export interface SiteMediaItem {
    id: number;
    name: string;
    alt_text: string;
    caption: string | null;
    url: string;
    byte_size?: number;
}

export interface SiteContentSection {
    id: string;
    type: 'text' | 'gallery' | 'cta' | 'columns';
    title: string;
    body: string;
    image_ids: number[];
    columns?: Array<{ id: string; body: string }>;
    button_label: string;
    button_url: string;
    visible: boolean;
}

export interface SitePageContent {
    seo: { title: string; description: string };
    hero: { eyebrow: string; title: string; description: string };
    sections: SiteContentSection[];
}

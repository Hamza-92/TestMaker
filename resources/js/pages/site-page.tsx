import { Head, usePage } from '@inertiajs/react';
import DOMPurify from 'dompurify';
import { ArrowRight } from 'lucide-react';
import PublicSiteFooter from '@/components/public-site-footer';
import SiteHeader from '@/components/site-header';
import type { Auth } from '@/types/auth';
import type { SiteMediaItem, SitePageContent } from '@/types/site-cms';

interface Props {
    [key: string]: unknown;
    auth: Auth;
    content: SitePageContent;
    media: SiteMediaItem[];
    preview?: boolean;
}

export default function SitePage() {
    const { auth, content, media, preview = false } = usePage<Props>().props;
    const mediaById = new Map(media.map((item) => [item.id, item]));

    return (
        <>
            <Head title={content.seo.title}>
                <meta name="description" content={content.seo.description} />
            </Head>
            <div id="top" className="min-h-screen bg-white text-slate-900">
                {preview && (
                    <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
                        Draft preview · Close this tab to return to the editor.
                    </div>
                )}
                <SiteHeader auth={auth} />
                <main>
                    <section className="border-b border-slate-100 bg-slate-50 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
                        <div className="mx-auto max-w-3xl text-center">
                            {content.hero.eyebrow && (
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                                    {content.hero.eyebrow}
                                </p>
                            )}
                            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                                {content.hero.title}
                            </h1>
                            {content.hero.description && (
                                <p className="mt-5 text-lg leading-8 text-slate-600">
                                    {content.hero.description}
                                </p>
                            )}
                        </div>
                    </section>
                    {content.sections
                        .filter((section) => section.visible)
                        .map((section, index) => {
                            if (section.type === 'gallery') {
                                return (
                                    <section
                                        key={section.id}
                                        className="px-4 py-16 sm:px-6 lg:px-8"
                                    >
                                        <div className="mx-auto max-w-[1200px]">
                                            <h2 className="font-display text-3xl font-bold tracking-tight">
                                                {section.title}
                                            </h2>
                                            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                {section.image_ids.map((id) => {
                                                    const image =
                                                        mediaById.get(id);

                                                    if (!image) {
                                                        return null;
                                                    }

                                                    return (
                                                        <figure
                                                            key={id}
                                                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                                        >
                                                            <img
                                                                src={image.url}
                                                                alt={
                                                                    image.alt_text
                                                                }
                                                                loading="lazy"
                                                                className="aspect-[4/3] w-full object-cover"
                                                            />
                                                            {image.caption && (
                                                                <figcaption className="px-4 py-3 text-sm text-slate-600">
                                                                    {
                                                                        image.caption
                                                                    }
                                                                </figcaption>
                                                            )}
                                                        </figure>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </section>
                                );
                            }

                            if (section.type === 'cta') {
                                return (
                                    <section
                                        key={section.id}
                                        className="bg-brand-950 px-4 py-16 text-white sm:px-6 lg:px-8"
                                    >
                                        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                            <div className="max-w-2xl">
                                                <h2 className="font-display text-3xl font-bold tracking-tight">
                                                    {section.title}
                                                </h2>
                                                {section.body && (
                                                    <div
                                                        className="mt-3 leading-7 text-blue-100 [&_a]:underline [&_p]:mb-3"
                                                        dangerouslySetInnerHTML={{
                                                            __html: DOMPurify.sanitize(
                                                                section.body,
                                                            ),
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            {section.button_url && (
                                                <a
                                                    href={section.button_url}
                                                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-900 hover:bg-blue-50"
                                                >
                                                    {section.button_label}
                                                    <ArrowRight size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </section>
                                );
                            }

                            return (
                                <section
                                    key={section.id}
                                    className={`px-4 py-16 sm:px-6 lg:px-8 ${index % 2 ? 'bg-slate-50' : 'bg-white'}`}
                                >
                                    <div className="mx-auto max-w-[850px]">
                                        <h2 className="font-display text-3xl font-bold tracking-tight">
                                            {section.title}
                                        </h2>
                                        <div
                                            className="mt-6 text-base leading-8 text-slate-700 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-brand-200 [&_blockquote]:pl-5 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_ul]:list-disc"
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(
                                                    section.body,
                                                ),
                                            }}
                                        />
                                    </div>
                                </section>
                            );
                        })}
                </main>
                <PublicSiteFooter />
            </div>
        </>
    );
}

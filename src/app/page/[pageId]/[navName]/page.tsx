import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { PageNavAside } from '@/components/page-nav-aside';
import { PublicSiteShell } from '@/components/public-site-shell';
import { getPageById } from '@/lib/db-pg/actions/page';
import { buildPagePath, pageNavNamesMatch } from '@/lib/page-path';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';
import { RICH_TEXT_IMAGE_ALIGN_CLASSES } from '@/components/ui/editor/tiptap-image-align';

type Props = {
    params: Promise<{
        pageId: string;
        navName: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { pageId: pageIdParam } = await params;
    const pageId = parseInt(pageIdParam, 10);
    const page = Number.isFinite(pageId) ? await getPageById(pageId) : null;

    if (!page) {
        return { title: 'Page not found | Sweet Shop USA Wholesale' };
    }

    return {
        title: `${page.name} | Sweet Shop USA Wholesale`,
    };
}

export default async function CmsPage({ params }: Props) {
    const routeParams = await params;
    const pageId = parseInt(routeParams.pageId, 10);
    const page = Number.isFinite(pageId) ? await getPageById(pageId) : null;

    if (!page) {
        notFound();
    }

    if (!pageNavNamesMatch(routeParams.navName, page.navName)) {
        permanentRedirect(buildPagePath(page.id, page.navName));
    }

    return (
        <PublicSiteShell>
            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}>
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    <PageNavAside selectedPageId={page.id} />

                    <div className="min-w-0 flex-1 space-y-8">
                        <header className="relative pl-5 sm:pl-6">
                            <span
                                className="absolute inset-y-0 left-0 w-1 rounded-full bg-linear-to-b from-[#5c3820] via-[#b89572] to-[#e8d0b8]"
                                aria-hidden
                            />
                            <h1 className="text-2xl font-semibold leading-tight text-[#3d2518] sm:text-3xl">{page.name}</h1>
                        </header>

                        {page.imageUrl ? (
                            <div className="relative aspect-21/9 overflow-hidden rounded-2xl border border-[#b89572] bg-[#f6ebdd]">
                                <Image src={page.imageUrl} alt="" fill className="object-cover" sizes="(max-width: 1152px) 100vw, 1152px" unoptimized />
                            </div>
                        ) : null}

                        <article
                            className={cn(
                                'cms-page-content text-xs leading-relaxed text-[#5c4032] [&_a]:text-[#4a2518] [&_a]:underline [&_a]:underline-offset-4 [&_h1]:mb-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:uppercase [&_h1]:tracking-[0.2em] [&_h1]:text-[#4a2518] [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-[0.18em] [&_h2]:text-[#5c4032] [&_img]:my-4 [&_img]:max-w-full [&_li]:ml-5 [&_ol]:my-4 [&_ol]:list-decimal [&_p]:my-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#d1b79a] [&_td]:p-2 [&_th]:border [&_th]:border-[#d1b79a] [&_th]:bg-[#f6ebdd] [&_th]:p-2 [&_th]:text-left [&_ul]:my-4 [&_ul]:list-disc',
                                RICH_TEXT_IMAGE_ALIGN_CLASSES,
                            )}
                            dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                    </div>
                </div>
            </main>
        </PublicSiteShell>
    );
}

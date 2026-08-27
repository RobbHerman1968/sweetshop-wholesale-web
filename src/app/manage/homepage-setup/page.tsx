import { Suspense } from 'react';
import { getActiveCategoriesForHomepageSetup, getHomePageContentForManage } from '@/lib/db-pg/actions/homepage';
import { HomepageSetupContent } from './homepage-setup-content';

export default async function ManageHomepageSetupPage() {
    const [content, categories] = await Promise.all([getHomePageContentForManage(), getActiveCategoriesForHomepageSetup()]);

    return (
        <Suspense fallback={<div className="mx-auto w-full max-w-7xl text-xs text-[#6e4a34]">Loading homepage setup…</div>}>
            <HomepageSetupContent initialContent={content} categories={categories} />
        </Suspense>
    );
}

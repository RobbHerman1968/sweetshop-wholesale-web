import { Suspense } from 'react';
import { getSiteSettingsFromDB } from '@/lib/db-pg/actions/site-setting';
import { SiteSettingsContent } from './site-settings-content';

export default async function ManageSiteSettingsPage() {
    const data = await getSiteSettingsFromDB();

    return (
        <Suspense fallback={<div className="mx-auto w-full max-w-7xl text-xs text-[#6e4a34]">Loading site settings…</div>}>
            <SiteSettingsContent data={data} />
        </Suspense>
    );
}

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isLocalhostHostHeader } from '@/lib/is-localhost';
import { SyncContent } from './sync-content';

export default async function ManageSyncPage() {
    const host = (await headers()).get('host');
    if (!isLocalhostHostHeader(host)) {
        redirect('/manage');
    }

    return <SyncContent />;
}

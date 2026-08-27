'use client';

import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 45_000;

type AppVersionReloadProps = {
    initialBuildId: string;
};

export function AppVersionReload({ initialBuildId }: AppVersionReloadProps) {
    const activeBuildIdRef = useRef(initialBuildId);

    useEffect(() => {
        activeBuildIdRef.current = initialBuildId;
    }, [initialBuildId]);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            return;
        }

        let cancelled = false;

        async function checkForNewVersion() {
            try {
                const response = await fetch('/api/app-version', {
                    cache: 'no-store',
                });
                if (!response.ok || cancelled) {
                    return;
                }

                const data = (await response.json()) as { buildId?: string };
                const latestBuildId = data.buildId?.trim();
                if (!latestBuildId || latestBuildId === activeBuildIdRef.current) {
                    return;
                }

                window.location.reload();
            } catch {
                // Ignore transient network errors; try again on the next interval.
            }
        }

        const intervalId = window.setInterval(() => {
            void checkForNewVersion();
        }, POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, []);

    return null;
}

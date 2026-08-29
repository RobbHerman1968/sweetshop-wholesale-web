'use client';

import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 15_000;
const MIN_CHECK_GAP_MS = 2_000;
const BUILD_QUERY_PARAM = '_v';

type AppVersionReloadProps = {
    initialBuildId: string;
};

function stripBuildQueryParam() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(BUILD_QUERY_PARAM)) {
        return;
    }

    url.searchParams.delete(BUILD_QUERY_PARAM);
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
}

function reloadForNewBuild(buildId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(BUILD_QUERY_PARAM, buildId);
    window.location.replace(url.toString());
}

export function AppVersionReload({ initialBuildId }: AppVersionReloadProps) {
    const activeBuildIdRef = useRef(initialBuildId);
    const reloadingRef = useRef(false);
    const lastCheckAtRef = useRef(0);

    useEffect(() => {
        activeBuildIdRef.current = initialBuildId;
    }, [initialBuildId]);

    useEffect(() => {
        stripBuildQueryParam();

        if (process.env.NODE_ENV === 'development') {
            return;
        }

        let cancelled = false;

        async function checkForNewVersion() {
            if (reloadingRef.current || cancelled) {
                return;
            }

            const now = Date.now();
            if (now - lastCheckAtRef.current < MIN_CHECK_GAP_MS) {
                return;
            }
            lastCheckAtRef.current = now;

            try {
                const response = await fetch(`/api/app-version?t=${now}`, {
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

                reloadingRef.current = true;
                reloadForNewBuild(latestBuildId);
            } catch {
                // Ignore transient network errors; try again on the next check.
            }
        }

        function checkIfVisible() {
            if (document.visibilityState === 'visible') {
                void checkForNewVersion();
            }
        }

        function onPageShow(event: PageTransitionEvent) {
            if (event.persisted || document.visibilityState === 'visible') {
                void checkForNewVersion();
            }
        }

        void checkForNewVersion();
        const intervalId = window.setInterval(() => {
            void checkForNewVersion();
        }, POLL_INTERVAL_MS);

        document.addEventListener('visibilitychange', checkIfVisible);
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('focus', checkIfVisible);
        window.addEventListener('online', checkIfVisible);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', checkIfVisible);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('focus', checkIfVisible);
            window.removeEventListener('online', checkIfVisible);
        };
    }, []);

    return null;
}

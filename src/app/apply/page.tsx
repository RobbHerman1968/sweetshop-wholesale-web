import { PublicSiteShell } from '@/components/public-site-shell';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import { WholesaleApplicationForm } from '@/components/wholesale-application-form';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';

export default function ApplyPage() {
    return (
        <PublicSiteShell>
            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}>
                <Card className="mb-8 overflow-hidden border-[#b89572] bg-gradient-to-r from-[#3d2518] via-[#5c3820] to-[#3d2518] text-[#fdf7ef] shadow-lg sm:rounded-3xl">
                    <CardHeader className="px-5 py-8 sm:px-10 sm:py-10">
                        <h1 className="text-xl font-semibold uppercase tracking-[0.28em] text-[#f5d9b8] sm:text-2xl sm:tracking-[0.32em]">
                            Apply for wholesale
                        </h1>
                        <CardDescription className="max-w-2xl text-[#fdf7ef]/90 sm:text-sm">
                            Partner with Sweet Shop USA to offer handcrafted chocolates, clusters, and toffees to your
                            customers. Submit your business details below — we typically respond within 2 business days.
                        </CardDescription>
                    </CardHeader>
                </Card>

                <WholesaleApplicationForm />
            </main>
        </PublicSiteShell>
    );
}

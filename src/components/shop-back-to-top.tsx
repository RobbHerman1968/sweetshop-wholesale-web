'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { SITE_MAIN_ID } from '@/lib/site-main';

const SHOW_AFTER_PX = 280;

export function ShopBackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const updateVisibility = () => {
            setVisible(window.scrollY > SHOW_AFTER_PX);
        };

        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });
        return () => window.removeEventListener('scroll', updateVisibility);
    }, []);

    if (!visible) {
        return null;
    }

    return (
        <button
            type="button"
            className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex size-11 items-center justify-center rounded-full bg-[#4a2518] text-[#fdf7ef] shadow-lg ring-offset-[#fdf7ef] transition-colors hover:bg-[#3a1b11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 md:hidden"
            aria-label="Back to top"
            onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.getElementById(SITE_MAIN_ID)?.focus({ preventScroll: true });
            }}
        >
            <ChevronUp className="size-6" strokeWidth={2.25} aria-hidden />
        </button>
    );
}

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { BrandBarNavLink } from '@/assets/brand-bar-nav';

type MenuNavLinkProps = {
    link: Pick<BrandBarNavLink, 'href' | 'title' | 'opensInNewWindow'>;
    className?: string;
    ariaCurrent?: 'page' | undefined;
    children?: React.ReactNode;
};

function MenuLinkLabel({ children, external }: { children: React.ReactNode; external?: boolean }) {
    if (!external) return children;

    return (
        <span className="inline-flex items-center gap-1.5">
            {children}
            <ExternalLink className="size-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            <span className="sr-only"> (opens in new tab)</span>
        </span>
    );
}

export function MenuNavLink({ link, className, ariaCurrent, children }: MenuNavLinkProps) {
    const label = children ?? link.title;

    if (link.opensInNewWindow) {
        return (
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} aria-current={ariaCurrent}>
                <MenuLinkLabel external>{label}</MenuLinkLabel>
            </a>
        );
    }

    return (
        <Link href={link.href} className={className} aria-current={ariaCurrent}>
            {label}
        </Link>
    );
}

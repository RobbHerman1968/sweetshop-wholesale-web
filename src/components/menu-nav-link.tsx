import Link from 'next/link';
import type { BrandBarNavLink } from '@/assets/brand-bar-nav';

type MenuNavLinkProps = {
    link: Pick<BrandBarNavLink, 'href' | 'title' | 'opensInNewWindow'>;
    className?: string;
    ariaCurrent?: 'page' | undefined;
    children?: React.ReactNode;
};

export function MenuNavLink({ link, className, ariaCurrent, children }: MenuNavLinkProps) {
    const label = children ?? link.title;

    if (link.opensInNewWindow) {
        return (
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} aria-current={ariaCurrent}>
                {label}
            </a>
        );
    }

    return (
        <Link href={link.href} className={className} aria-current={ariaCurrent}>
            {label}
        </Link>
    );
}

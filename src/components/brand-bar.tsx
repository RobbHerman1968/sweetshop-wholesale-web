'use client';

import { brandBarNavCategories } from '@/assets/brand-bar-nav';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuList,
    NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

export function BrandBar() {
    return (
        <nav className="w-full py-0" aria-label="Product categories">
            <div className="mx-auto flex max-w-6xl justify-center px-3 sm:px-4">
                <NavigationMenu className="max-w-none">
                    <NavigationMenuList className="flex-wrap justify-center gap-0 sm:gap-1">
                        {brandBarNavCategories.map((cat) => (
                            <NavigationMenuItem key={cat.label}>
                                <NavigationMenuTrigger className="data-[state=open]:bg-[#ede0d4]">
                                    {cat.label}
                                </NavigationMenuTrigger>
                                <NavigationMenuContent className="max-w-[min(100vw-2rem,300px)] sm:max-w-[min(100vw-2rem,420px)]">
                                    <ul className="grid w-full min-w-[220px] grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3">
                                        <li className="col-span-full border-b border-[#e8ddd4] pb-2 sm:pb-3">
                                            <p className="text-left text-[12px] font-normal leading-snug normal-case tracking-normal text-[#8b6b4a] sm:text-[13px]">{cat.description}</p>
                                        </li>
                                        {cat.links.map((link) => (
                                            <li key={`${cat.label}-${link.title}`} className="min-w-0">
                                                <a
                                                    href={link.href}
                                                    className="block rounded-md border border-[#e8ddd4] bg-[#faf7f4] px-3 py-2.5 text-left transition-colors hover:border-[#d4c4b0] hover:bg-[#f3e0cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4a882] focus-visible:ring-offset-1 active:bg-[#ede0d4]"
                                                >
                                                    <span className="block text-[13px] font-semibold normal-case tracking-normal text-[#5c4032] sm:text-sm">
                                                        {link.title}
                                                    </span>
                                                    <span className="mt-1 block text-[10px] font-normal leading-snug text-[#8b6b4a] sm:text-[11px]">
                                                        {link.description}
                                                    </span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>
            </div>
        </nav>
    );
}

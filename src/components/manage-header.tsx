'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserAccountMenu } from '@/components/user-account-menu';
import { WholesaleAccountSwitcher } from '@/components/wholesale-account-switcher';

export function ManageHeader() {
    return (
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#d4c4b0] bg-[#f6ebdd]">
            <div className="mx-auto flex max-w-full items-center justify-between gap-2 px-3 pt-1.5 pb-1 text-xs uppercase tracking-[0.18em] text-[#5c4032] sm:px-4 sm:pt-2 sm:pb-1">
                <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                    <Link
                        href="/"
                        className="inline-flex shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]"
                    >
                        <Image
                            src="/logo.png"
                            alt="Sweet Shop USA wholesale, home"
                            width={36}
                            height={36}
                            className="h-7 w-7 object-contain sm:h-9 sm:w-9"
                            priority
                        />
                    </Link>
                    <span className="truncate pl-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5c4032] sm:pl-3 sm:text-[12px]">
                        Sweet Shop Management
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <WholesaleAccountSwitcher />
                    <UserAccountMenu />
                </div>
            </div>
        </header>
    );
}

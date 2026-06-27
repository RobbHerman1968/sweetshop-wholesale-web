import Link from 'next/link';
import { MenuForm } from '../menu-form';

export default function ManageAddMenuPage() {
    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/manage/menus"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline"
                >
                    ← Back to menus
                </Link>
            </div>
            <MenuForm backHref="/manage/menus" />
        </div>
    );
}

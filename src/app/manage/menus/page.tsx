import { getMenusFromDB } from '@/lib/db-pg/actions/menu';
import { MenusContent } from './menus-content';

export default async function ManageMenusPage() {
    const menus = await getMenusFromDB();

    return (
        <div className="flex h-full min-h-0 flex-col">
            <MenusContent menus={menus} />
        </div>
    );
}

import { getMenusFromDB } from '@/lib/db-pg/actions/menu';
import { MenusContent } from './menus-content';

export default async function ManageMenusPage() {
    const menus = await getMenusFromDB();

    return <MenusContent menus={menus} />;
}

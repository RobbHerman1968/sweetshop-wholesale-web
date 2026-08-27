import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { buildExcelOrderSheetTemplateBuffer } from '@/lib/excel-order-sheet/build-template';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return new Response('Unauthorized', { status: 401 });
    }

    const buffer = buildExcelOrderSheetTemplateBuffer();

    return new Response(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="order-sheet-template.xlsx"',
        },
    });
}

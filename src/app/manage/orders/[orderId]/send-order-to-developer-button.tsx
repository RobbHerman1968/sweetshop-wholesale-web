'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { sendOrderToDeveloper } from '@/lib/db-pg/actions/send-order-to-developer';

type SendOrderToDeveloperButtonProps = {
    orderId: number;
    sendEmailFrom: string | null;
    developerEmail: string | null;
};

export function SendOrderToDeveloperButton({ orderId, sendEmailFrom, developerEmail }: SendOrderToDeveloperButtonProps) {
    const [sending, setSending] = useState(false);
    const canSend = Boolean(sendEmailFrom && developerEmail);

    async function handleClick() {
        setSending(true);

        const result = await sendOrderToDeveloper(orderId);

        setSending(false);

        if (!result.ok) {
            toast({
                variant: 'destructive',
                title: 'Could not send order',
                description: result.error,
            });
            return;
        }

        toast({
            title: 'Order sent',
            description: `Sent from ${sendEmailFrom} to ${developerEmail}.`,
        });
    }

    return (
        <div className="flex flex-col items-end gap-1">
            {canSend ? (
                <p className="max-w-xs text-right text-[10px] text-[#6e4a34]">
                    From <span className="font-semibold">{sendEmailFrom}</span> to{' '}
                    <span className="font-semibold">{developerEmail}</span>
                </p>
            ) : (
                <p className="max-w-xs text-right text-[10px] text-[#6e4a34]">
                    Configure{' '}
                    <Link href="/manage/site-settings" className="font-semibold underline-offset-2 hover:underline">
                        Send Email From
                    </Link>{' '}
                    and{' '}
                    <Link href="/manage/site-settings" className="font-semibold underline-offset-2 hover:underline">
                        Developer Email Address
                    </Link>{' '}
                    in Site Settings.
                </p>
            )}
            <Button
                type="button"
                variant="sweet"
                className="px-3 py-1 text-[10px] tracking-[0.15em]"
                disabled={sending || !canSend}
                onClick={handleClick}
            >
                {sending ? 'Sending…' : 'Send to developer'}
            </Button>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
    sendOrderToCustomer,
    sendOrderToDeveloper,
    sendOrderToSales,
} from '@/lib/db-pg/actions/send-order-emails';

type ActionKey = 'customer' | 'sales' | 'developer';

type OrderEmailActionsProps = {
    orderId: number;
    sendEmailFrom: string | null;
    developerEmail: string | null;
    salesEmail: string | null;
    customerEmail: string | null;
    actions?: ActionKey[];
    align?: 'start' | 'end';
};

export function OrderEmailActions({
    orderId,
    sendEmailFrom,
    developerEmail,
    salesEmail,
    customerEmail,
    actions = ['customer', 'sales', 'developer'],
    align = 'end',
}: OrderEmailActionsProps) {
    const [sending, setSending] = useState<ActionKey | null>(null);

    const hasFrom = Boolean(sendEmailFrom);
    const canSendCustomer = hasFrom && Boolean(customerEmail);
    const canSendSales = hasFrom && Boolean(salesEmail);
    const canSendDeveloper = hasFrom && Boolean(developerEmail);
    const showCustomer = actions.includes('customer');
    const showSales = actions.includes('sales');
    const showDeveloper = actions.includes('developer');

    async function runAction(key: ActionKey) {
        setSending(key);

        const result =
            key === 'customer'
                ? await sendOrderToCustomer(orderId)
                : key === 'sales'
                  ? await sendOrderToSales(orderId)
                  : await sendOrderToDeveloper(orderId);

        setSending(null);

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
            description:
                key === 'customer'
                    ? 'The order confirmation was emailed to the customer.'
                    : key === 'sales'
                      ? 'The order was emailed to sales.'
                      : 'The order was emailed to the developer.',
        });
    }

    return (
        <div className={`flex flex-col gap-2 ${align === 'end' ? 'items-end' : 'items-start'}`}>
            {!hasFrom ? (
                <p className={`max-w-xs text-[10px] text-[#6e4a34] ${align === 'end' ? 'text-right' : 'text-left'}`}>
                    Configure{' '}
                    <Link href="/manage/site-settings" className="font-semibold underline-offset-2 hover:underline">
                        Send Email From
                    </Link>{' '}
                    in Site Settings.
                </p>
            ) : null}
            <div className={`flex flex-wrap gap-2 ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
                {showCustomer ? (
                    <Button
                        type="button"
                        variant="sweet"
                        className="px-3 py-1 text-[10px] tracking-[0.15em]"
                        disabled={sending != null || !canSendCustomer}
                        title={!customerEmail ? 'No customer email on this order' : undefined}
                        onClick={() => void runAction('customer')}
                    >
                        {sending === 'customer' ? 'Sending…' : 'Send to customer'}
                    </Button>
                ) : null}
                {showSales ? (
                    <Button
                        type="button"
                        variant="sweet"
                        className="px-3 py-1 text-[10px] tracking-[0.15em]"
                        disabled={sending != null || !canSendSales}
                        title={!salesEmail ? 'Configure Sales Order Email Address in Site Settings' : undefined}
                        onClick={() => void runAction('sales')}
                    >
                        {sending === 'sales' ? 'Sending…' : 'Send to sales'}
                    </Button>
                ) : null}
                {showDeveloper ? (
                    <Button
                        type="button"
                        variant="sweet"
                        className="px-3 py-1 text-[10px] tracking-[0.15em]"
                        disabled={sending != null || !canSendDeveloper}
                        title={!developerEmail ? 'Configure Developer Email Address in Site Settings' : undefined}
                        onClick={() => void runAction('developer')}
                    >
                        {sending === 'developer' ? 'Sending…' : 'Send to developer'}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

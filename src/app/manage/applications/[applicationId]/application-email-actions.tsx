'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { resendApplicationEmail } from '@/lib/db-pg/actions/application';

type ApplicationEmailActionsProps = {
    applicationId: number;
    emailSent: boolean;
    applyNowEmail: string | null;
    sendEmailFrom: string | null;
};

export function ApplicationEmailActions({
    applicationId,
    emailSent,
    applyNowEmail,
    sendEmailFrom,
}: ApplicationEmailActionsProps) {
    const router = useRouter();
    const [sending, setSending] = useState(false);
    const canSend = Boolean(sendEmailFrom && applyNowEmail);

    async function handleResend() {
        setSending(true);
        const result = await resendApplicationEmail(applicationId);
        setSending(false);

        if (!result.ok) {
            toast({
                variant: 'destructive',
                title: 'Could not send application',
                description: result.error,
            });
            return;
        }

        toast({
            title: emailSent ? 'Application resent' : 'Application sent',
            description: applyNowEmail ? `Sent to ${applyNowEmail}.` : 'Notification email sent.',
        });
        router.refresh();
    }

    return (
        <div className="flex flex-col items-start gap-2 sm:items-end">
            {!canSend ? (
                <p className="max-w-xs text-[10px] text-[#6e4a34] sm:text-right">
                    Configure Send Email From and Apply Now Email Address in Site Settings before sending.
                </p>
            ) : null}
            <Button type="button" variant="sweet" className="text-[11px]" disabled={!canSend || sending} onClick={handleResend}>
                {sending ? 'Sending…' : emailSent ? 'Resend email' : 'Send email'}
            </Button>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { resendApplicationEmail, sendApplicationToDeveloper } from '@/lib/db-pg/actions/application';

type ActionKey = 'applyNow' | 'developer';

type ApplicationEmailActionsProps = {
    applicationId: number;
    emailSent: boolean;
    applyNowEmail: string | null;
    developerEmail: string | null;
    sendEmailFrom: string | null;
    actions?: ActionKey[];
    align?: 'start' | 'end';
};

export function ApplicationEmailActions({
    applicationId,
    emailSent,
    applyNowEmail,
    developerEmail,
    sendEmailFrom,
    actions = ['applyNow', 'developer'],
    align = 'end',
}: ApplicationEmailActionsProps) {
    const router = useRouter();
    const [sending, setSending] = useState<ActionKey | null>(null);

    const hasFrom = Boolean(sendEmailFrom);
    const canSendApplyNow = hasFrom && Boolean(applyNowEmail);
    const canSendDeveloper = hasFrom && Boolean(developerEmail);
    const showApplyNow = actions.includes('applyNow');
    const showDeveloper = actions.includes('developer');

    async function runAction(key: ActionKey) {
        setSending(key);

        const result = key === 'applyNow' ? await resendApplicationEmail(applicationId) : await sendApplicationToDeveloper(applicationId);

        setSending(null);

        if (!result.ok) {
            toast({
                variant: 'destructive',
                title: 'Could not send application',
                description: result.error,
            });
            return;
        }

        toast({
            title: key === 'applyNow' ? (emailSent ? 'Application resent' : 'Application sent') : 'Application sent',
            description:
                key === 'applyNow'
                    ? applyNowEmail
                        ? `Sent to ${applyNowEmail}.`
                        : 'Notification email sent.'
                    : 'The application was emailed to the developer.',
        });

        if (key === 'applyNow') {
            router.refresh();
        }
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
                {showApplyNow ? (
                    <Button
                        type="button"
                        variant="sweet"
                        className="px-3 py-1 text-[10px] tracking-[0.15em]"
                        disabled={sending != null || !canSendApplyNow}
                        title={!applyNowEmail ? 'Configure Apply Now Email Address in Site Settings' : undefined}
                        onClick={() => void runAction('applyNow')}
                    >
                        {sending === 'applyNow' ? 'Sending…' : emailSent ? 'Resend email' : 'Send email'}
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

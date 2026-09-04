'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { count, desc, eq, ilike, or } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import { getApplyNowEmailAddress, getSendEmailFromAddress } from '@/lib/db-pg/actions/site-setting';
import { application } from '@/lib/drizzle/schema';
import { buildWholesaleApplicationEmailContent } from '@/lib/email/wholesale-application-email-template';
import { sendEmailViaResend } from '@/lib/resend-email';

export type ManageApplicationListRow = {
    id: number;
    createdAt: string;
    businessName: string;
    contactFirstName: string;
    contactLastName: string;
    email: string;
    phone: string;
    city: string;
    state: string;
};

export type ManageApplicationDetail = {
    id: number;
    createdAt: string;
    businessName: string;
    taxId: string;
    contactFirstName: string;
    contactLastName: string;
    billingAddress1: string;
    billingAddress2: string | null;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    fax: string | null;
    email: string;
    emailSent: boolean;
};

type FormResult = { ok: true } | { ok: false; error: string };

export async function getPaginatedApplicationsFromDB({
    page = 1,
    limit = 50,
    search,
}: {
    page?: number;
    limit?: number;
    search?: string;
} = {}) {
    const offset = (page - 1) * limit;
    const trimmedSearch = search?.trim() ?? '';
    const where =
        trimmedSearch.length > 0
            ? or(
                  ilike(application.businessName, `%${trimmedSearch}%`),
                  ilike(application.contactFirstName, `%${trimmedSearch}%`),
                  ilike(application.contactLastName, `%${trimmedSearch}%`),
                  ilike(application.email, `%${trimmedSearch}%`),
                  ilike(application.phone, `%${trimmedSearch}%`),
                  ilike(application.city, `%${trimmedSearch}%`),
                  ilike(application.state, `%${trimmedSearch}%`),
              )
            : undefined;

    const [rows, countResult] = await Promise.all([
        db
            .select({
                id: application.id,
                createdAt: application.createdAt,
                businessName: application.businessName,
                contactFirstName: application.contactFirstName,
                contactLastName: application.contactLastName,
                email: application.email,
                phone: application.phone,
                city: application.city,
                state: application.state,
            })
            .from(application)
            .where(where)
            .orderBy(desc(application.createdAt), desc(application.id))
            .limit(limit)
            .offset(offset),
        db.select({ total: count() }).from(application).where(where),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return {
        data: rows as ManageApplicationListRow[],
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    };
}

export async function getApplicationByIdForManage(applicationId: number): Promise<ManageApplicationDetail | null> {
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
        return null;
    }

    const [row] = await db
        .select({
            id: application.id,
            createdAt: application.createdAt,
            businessName: application.businessName,
            taxId: application.taxId,
            contactFirstName: application.contactFirstName,
            contactLastName: application.contactLastName,
            billingAddress1: application.billingAddress1,
            billingAddress2: application.billingAddress2,
            city: application.city,
            state: application.state,
            zipCode: application.zipCode,
            phone: application.phone,
            fax: application.fax,
            email: application.email,
            emailSent: application.emailSent,
        })
        .from(application)
        .where(eq(application.id, applicationId))
        .limit(1);

    return row ?? null;
}

export async function resendApplicationEmail(applicationId: number): Promise<FormResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return { ok: false, error: 'Unauthorized.' };
    }

    const detail = await getApplicationByIdForManage(applicationId);
    if (!detail) {
        return { ok: false, error: 'Application not found.' };
    }

    const [fromEmail, toEmail] = await Promise.all([getSendEmailFromAddress(), getApplyNowEmailAddress()]);
    if (!fromEmail) {
        return { ok: false, error: 'Configure Send Email From in Site Settings before sending.' };
    }
    if (!toEmail) {
        return { ok: false, error: 'Configure Apply Now Email Address in Site Settings before sending.' };
    }

    const { subject, html, text } = buildWholesaleApplicationEmailContent({
        businessName: detail.businessName,
        taxId: detail.taxId,
        contactFirstName: detail.contactFirstName,
        contactLastName: detail.contactLastName,
        billingAddress1: detail.billingAddress1,
        billingAddress2: detail.billingAddress2 ?? undefined,
        city: detail.city,
        state: detail.state,
        zipCode: detail.zipCode,
        phone: detail.phone,
        fax: detail.fax ?? undefined,
        email: detail.email,
    });

    const result = await sendEmailViaResend({
        from: fromEmail,
        to: toEmail,
        subject,
        html,
        text,
        logContext: {
            stage: 'email',
            message: `Wholesale application email failed for application #${applicationId}.`,
            successMessage: `Wholesale application email sent for application #${applicationId}.`,
        },
    });

    if (!result.ok) {
        return result;
    }

    await db.update(application).set({ emailSent: true }).where(eq(application.id, applicationId));
    revalidatePath(`/manage/applications/${applicationId}`);
    revalidatePath('/manage/applications');

    return { ok: true };
}

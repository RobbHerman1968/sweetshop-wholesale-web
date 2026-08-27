'use server';

import { count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { application } from '@/lib/drizzle/schema';

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
    emailSent: boolean;
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
                emailSent: application.emailSent,
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

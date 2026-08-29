export type AccountMateMappedAccountFields = {
    name: string | null;
    contactFirstName: string | null;
    contactLastName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    contactAddress1: string | null;
    contactAddress2: string | null;
    contactCity: string | null;
    contactState: string | null;
    contactZipCode: string | null;
    cpaycode: string | null;
    terms: string | null;
    isTerms: boolean;
};

function trimAccountMateValue(value: unknown): string | null {
    if (value == null) return null;
    const cleaned = String(value)
        .replace(/\0/g, '')
        .replace(/^\uFEFF/, '')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned || null;
}

function isNetTermsPayCode(cpaycode: string | null): boolean {
    return cpaycode != null && /^NET/i.test(cpaycode);
}

function stripPhoneToDigits(value: unknown): string | null {
    if (value == null) return null;
    const digits = String(value).trim().replace(/\D/g, '');
    return digits || null;
}

function readAccountMateField(row: Record<string, unknown>, fieldName: string): string | null {
    const target = fieldName.toLowerCase();
    for (const [key, value] of Object.entries(row)) {
        if (key.toLowerCase() === target) {
            return trimAccountMateValue(value);
        }
    }
    return null;
}

function readAccountMatePhoneField(row: Record<string, unknown>, fieldName: string): string | null {
    const target = fieldName.toLowerCase();
    for (const [key, value] of Object.entries(row)) {
        if (key.toLowerCase() === target) {
            return stripPhoneToDigits(value);
        }
    }
    return null;
}

/** Ensures every mapped string field is trimmed before save or derived logic. */
function normalizeMappedAccountFields(fields: AccountMateMappedAccountFields): AccountMateMappedAccountFields {
    const cpaycode = trimAccountMateValue(fields.cpaycode);

    return {
        name: trimAccountMateValue(fields.name),
        contactFirstName: trimAccountMateValue(fields.contactFirstName),
        contactLastName: trimAccountMateValue(fields.contactLastName),
        contactEmail: trimAccountMateValue(fields.contactEmail)?.toLowerCase() ?? null,
        contactPhone: stripPhoneToDigits(fields.contactPhone),
        contactAddress1: trimAccountMateValue(fields.contactAddress1),
        contactAddress2: trimAccountMateValue(fields.contactAddress2),
        contactCity: trimAccountMateValue(fields.contactCity),
        contactState: trimAccountMateValue(fields.contactState),
        contactZipCode: trimAccountMateValue(fields.contactZipCode),
        cpaycode,
        terms: cpaycode,
        isTerms: isNetTermsPayCode(cpaycode),
    };
}

/** Maps AccountMate `arcust_web` columns onto wholesale account fields. */
export function mapAccountMateRowToAccountFields(row: Record<string, unknown>): AccountMateMappedAccountFields {
    const cpaycode = readAccountMateField(row, 'cpaycode');

    return normalizeMappedAccountFields({
        name: readAccountMateField(row, 'ccompany'),
        contactFirstName: readAccountMateField(row, 'cfname'),
        contactLastName: readAccountMateField(row, 'clname'),
        contactEmail: readAccountMateField(row, 'cemail'),
        contactPhone: readAccountMatePhoneField(row, 'cphone1'),
        contactAddress1: readAccountMateField(row, 'caddr1'),
        contactAddress2: readAccountMateField(row, 'caddr2'),
        contactCity: readAccountMateField(row, 'ccity'),
        contactState: readAccountMateField(row, 'cstate'),
        contactZipCode: readAccountMateField(row, 'czip'),
        cpaycode,
        terms: cpaycode,
        isTerms: isNetTermsPayCode(cpaycode),
    });
}

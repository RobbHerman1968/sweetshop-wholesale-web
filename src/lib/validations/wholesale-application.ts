import { z } from 'zod';
import { normalizePhoneDigits } from '@/lib/checkout-utils';

const phoneDigitsSchema = z
    .string()
    .trim()
    .transform((value) => normalizePhoneDigits(value))
    .refine((value) => value.length === 10, 'Enter a 10-digit phone number');

const optionalPhoneDigitsSchema = z
    .string()
    .trim()
    .optional()
    .transform((value) => {
        const digits = normalizePhoneDigits(value ?? '');
        return digits.length > 0 ? digits : undefined;
    })
    .refine((value) => value == null || value.length === 10, 'Enter a 10-digit fax number');

const optionalTrimmedText = z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const OPEN_SCHEDULE_OPTIONS = [
    { value: 'seasonal', label: 'Seasonally' },
    { value: 'year-round', label: 'Year-round' },
] as const;

export type OpenScheduleValue = (typeof OPEN_SCHEDULE_OPTIONS)[number]['value'];

export const wholesaleApplicationSchema = z
    .object({
        businessName: z.string().trim().min(1, 'Business name is required'),
        taxId: z.string().trim().min(1, 'Tax ID / Reseller Permit # is required'),
        contactFirstName: z.string().trim().min(1, 'First name is required'),
        contactLastName: z.string().trim().min(1, 'Last name is required'),
        billingAddress1: z.string().trim().min(1, 'Business billing address is required'),
        billingAddress2: z.string().trim().optional(),
        city: z.string().trim().min(1, 'City is required'),
        state: z.string().trim().min(1, 'State is required'),
        zipCode: z.string().trim().min(1, 'Zip code is required'),
        phone: phoneDigitsSchema,
        fax: optionalPhoneDigitsSchema,
        email: z.string().trim().min(1, 'Email address is required').email('Enter a valid email address'),
        currentlySells: z.boolean({
            error: 'Please select Yes or No',
        }),
        soldInPast: z.boolean({
            error: 'Please select Yes or No',
        }),
        howDidYouFindOut: z.string().trim().min(1, 'Please tell us how you found Sweet Shop USA'),
        referredByBroker: z.boolean({
            error: 'Please select Yes or No',
        }),
        brokerName: optionalTrimmedText,
        hasBrickAndMortar: z.boolean({
            error: 'Please select Yes or No',
        }),
        businessType: optionalTrimmedText,
        openSeasonallyOrYearRound: z.enum(['seasonal', 'year-round'], {
            error: 'Please select seasonally or year-round',
        }),
        hoursOfOperation: z.string().trim().min(1, 'Hours of operation are required'),
        socialMediaHandles: optionalTrimmedText,
    })
    .superRefine((data, ctx) => {
        if (data.referredByBroker && !data.brokerName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['brokerName'],
                message: 'Enter the broker name',
            });
        }
        if (!data.hasBrickAndMortar && !data.businessType) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['businessType'],
                message: 'Describe the type of business you operate',
            });
        }
    });

export type WholesaleApplicationInput = z.infer<typeof wholesaleApplicationSchema>;

export type WholesaleApplicationField = keyof WholesaleApplicationInput;

/** Form draft allows unset Yes/No and schedule choices before submit. */
export type WholesaleApplicationFormValues = Omit<
    WholesaleApplicationInput,
    | 'currentlySells'
    | 'soldInPast'
    | 'referredByBroker'
    | 'hasBrickAndMortar'
    | 'openSeasonallyOrYearRound'
    | 'brokerName'
    | 'businessType'
    | 'socialMediaHandles'
    | 'billingAddress2'
    | 'fax'
> & {
    billingAddress2: string;
    fax: string;
    currentlySells: boolean | null;
    soldInPast: boolean | null;
    referredByBroker: boolean | null;
    hasBrickAndMortar: boolean | null;
    openSeasonallyOrYearRound: OpenScheduleValue | '';
    brokerName: string;
    businessType: string;
    socialMediaHandles: string;
};

export function formatYesNo(value: boolean | null | undefined): string {
    if (value == null) return '—';
    return value ? 'Yes' : 'No';
}

export function formatOpenSchedule(value: string | null | undefined): string {
    if (!value) return '—';
    if (value === 'seasonal') return 'Seasonally';
    if (value === 'year-round') return 'Year-round';
    return value;
}

import { z } from 'zod';

export const wholesaleApplicationSchema = z.object({
    businessName: z.string().trim().min(1, 'Business name is required'),
    taxId: z.string().trim().min(1, 'Tax ID / Reseller Permit # is required'),
    contactFirstName: z.string().trim().min(1, 'First name is required'),
    contactLastName: z.string().trim().min(1, 'Last name is required'),
    billingAddress1: z.string().trim().min(1, 'Business billing address is required'),
    billingAddress2: z.string().trim().optional(),
    city: z.string().trim().min(1, 'City is required'),
    state: z.string().trim().min(1, 'State is required'),
    zipCode: z.string().trim().min(1, 'Zip code is required'),
    phone: z.string().trim().min(1, 'Phone number is required'),
    fax: z.string().trim().optional(),
    email: z.string().trim().min(1, 'Email address is required').email('Enter a valid email address'),
});

export type WholesaleApplicationInput = z.infer<typeof wholesaleApplicationSchema>;

export type WholesaleApplicationField = keyof WholesaleApplicationInput;

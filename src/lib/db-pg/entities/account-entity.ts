export type Account = {
    id: number;
    userId: string;
    accountMateId: string;
    isSkipTax: boolean;
    isSkipShipping: boolean;
    isFreeGroundShipping: boolean;
    terms: string;
    isTerms: boolean;
    name: string;
    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress1: string;
    contactAddress2: string;
    contactCity: string;
    contactState: string;
    contactZipCode: string;
}

export type AccountGroup = {
    id: number;
    accountId: number;
    productGroupId: number;
}
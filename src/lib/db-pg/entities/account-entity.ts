export type Account = {
    id: number;
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
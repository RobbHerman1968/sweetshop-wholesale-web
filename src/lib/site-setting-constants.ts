/** Site setting id for the order subtotal above which ground shipping is free. */
export const FREE_SHIPPING_THRESHOLD_SETTING_ID = 1;

/** Site setting id for the minimum order amount. */
export const MINIMUM_ORDER_SETTING_ID = 2;

/** Site setting id for email addresses notified when AccountMate order submission fails. */
export const NOTIFY_ACCOUNTMATE_FAILURE_SETTING_ID = 3;

/** Site setting id for the from address used when sending site emails. */
export const SEND_EMAIL_FROM_SETTING_ID = 4;

/** Default Resend from header: display name plus angle-bracket email. */
export const DEFAULT_SEND_EMAIL_FROM = 'Sweetshopusawholesale <no-reply@sweetshopusawholesale.com>';

/** Site setting id for the developer email address used for order support. */
export const DEVELOPER_EMAIL_SETTING_ID = 5;

/** Site setting id for the sales order notification / order copy email address. */
export const COPY_ORDER_EMAIL_SETTING_ID = 6;
export const SALES_ORDER_EMAIL_SETTING_ID = COPY_ORDER_EMAIL_SETTING_ID;

/** Site setting id for wholesale Apply Now application notification email. */
export const APPLY_NOW_EMAIL_SETTING_ID = 7;

export const EMAIL_LIST_SITE_SETTING_IDS = new Set<number>([NOTIFY_ACCOUNTMATE_FAILURE_SETTING_ID]);

export const SINGLE_EMAIL_SITE_SETTING_IDS = new Set<number>([
    SEND_EMAIL_FROM_SETTING_ID,
    DEVELOPER_EMAIL_SETTING_ID,
    SALES_ORDER_EMAIL_SETTING_ID,
    APPLY_NOW_EMAIL_SETTING_ID,
]);

export function isEmailListSiteSetting(id: number): boolean {
    return EMAIL_LIST_SITE_SETTING_IDS.has(id);
}

export function isSingleEmailSiteSetting(id: number): boolean {
    return SINGLE_EMAIL_SITE_SETTING_IDS.has(id);
}

export type SiteSettingKind = 'numeric' | 'emailList' | 'email';

export function siteSettingKind(id: number): SiteSettingKind {
    if (isEmailListSiteSetting(id)) return 'emailList';
    if (isSingleEmailSiteSetting(id)) return 'email';
    return 'numeric';
}

export function getSiteSettingHelperText(id: number, kind: SiteSettingKind): string | null {
    if (kind === 'emailList') {
        return 'One email address per line.';
    }

    if (id === SEND_EMAIL_FROM_SETTING_ID) {
        return 'From header for site emails. Use display name plus email, e.g. Sweetshopusawholesale <no-reply@sweetshopusawholesale.com>. The domain must be verified in Resend.';
    }

    if (id === DEVELOPER_EMAIL_SETTING_ID) {
        return 'Developer address for order troubleshooting and resend requests.';
    }

    if (id === SALES_ORDER_EMAIL_SETTING_ID) {
        return 'Sales address used for order confirmations and Send to sales.';
    }

    if (id === APPLY_NOW_EMAIL_SETTING_ID) {
        return 'Address that receives wholesale Apply Now application submissions.';
    }

    return kind === 'email' ? 'Enter a valid email address.' : null;
}

export function getSiteSettingEmailPlaceholder(id: number): string {
    if (id === SEND_EMAIL_FROM_SETTING_ID) {
        return DEFAULT_SEND_EMAIL_FROM;
    }

    if (id === DEVELOPER_EMAIL_SETTING_ID) {
        return 'developer@example.com';
    }

    if (id === SALES_ORDER_EMAIL_SETTING_ID || id === APPLY_NOW_EMAIL_SETTING_ID) {
        return 'sales@sweetshopusa.com';
    }

    return 'noreply@sweetshopusa.com';
}

export function isEmailFromSiteSetting(id: number): boolean {
    return id === SEND_EMAIL_FROM_SETTING_ID;
}

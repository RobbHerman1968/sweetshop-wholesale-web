import { escapeHtml } from '@/lib/email/html-utils';
import { formatPhoneDisplay } from '@/lib/checkout-utils';
import type { WholesaleApplicationInput } from '@/lib/validations/wholesale-application';

const BRAND = {
    brown: '#6e4a34',
    brownDark: '#4a2518',
    tan: '#c49a78',
    cream: '#f8eddf',
    creamLight: '#fdf7ef',
    page: '#f2dfcc',
    muted: '#8a7264',
};

export type WholesaleApplicationEmailContent = {
    subject: string;
    html: string;
    text: string;
};

function row(label: string, value: string): string {
    return `<tr>
      <td style="padding:6px 0;color:${BRAND.muted};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;width:160px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:${BRAND.brownDark};font-size:14px;vertical-align:top;">${value}</td>
    </tr>`;
}

export function buildWholesaleApplicationEmailContent(
    data: WholesaleApplicationInput,
    options?: { attachmentName?: string | null },
): WholesaleApplicationEmailContent {
    const businessName = data.businessName.trim();
    const contactName = `${data.contactFirstName.trim()} ${data.contactLastName.trim()}`.trim();
    const subject = `Wholesale application: ${businessName}`;

    const addressLines = [
        data.billingAddress1.trim(),
        data.billingAddress2?.trim() || '',
        `${data.city.trim()}, ${data.state.trim()} ${data.zipCode.trim()}`,
    ].filter(Boolean);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:${BRAND.page};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:collapse;">
          <tr>
            <td style="padding:24px 28px;background:${BRAND.brown};border-radius:16px 16px 0 0;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#f8eddf;">Sweet Shop USA Wholesale</div>
              <div style="margin-top:10px;font-size:28px;line-height:1.2;font-weight:700;color:#ffffff;">Apply Now submission</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;background:${BRAND.cream};border:1px solid ${BRAND.tan};border-top:none;border-radius:0 0 16px 16px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.brownDark};">
                A new wholesale account request was submitted from the Apply Now form.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                ${row('Business', escapeHtml(businessName))}
                ${row('Tax / reseller #', escapeHtml(data.taxId.trim()))}
                ${row('Contact', escapeHtml(contactName))}
                ${row('Email', escapeHtml(data.email.trim()))}
                ${row('Phone', escapeHtml(formatPhoneDisplay(data.phone)))}
                ${row('Fax', data.fax ? escapeHtml(formatPhoneDisplay(data.fax)) : '—')}
                ${row('Billing address', escapeHtml(addressLines.join('\n')).replaceAll('\n', '<br />'))}
                ${options?.attachmentName
                    ? row('Attachment', escapeHtml(options.attachmentName))
                    : ''}
              </table>
              <div style="margin-top:24px;padding-top:16px;border-top:1px solid ${BRAND.tan};font-size:12px;line-height:1.5;color:${BRAND.muted};">
                Sweet Shop USA · Wholesale Support · 1-800-222-2269
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = [
        'Wholesale Apply Now submission',
        '',
        `Business: ${businessName}`,
        `Tax / reseller #: ${data.taxId.trim()}`,
        `Contact: ${contactName}`,
        `Email: ${data.email.trim()}`,
        `Phone: ${formatPhoneDisplay(data.phone)}`,
        `Fax: ${data.fax ? formatPhoneDisplay(data.fax) : '—'}`,
        'Billing address:',
        ...addressLines.map((line) => `  ${line}`),
        ...(options?.attachmentName ? ['', `Attachment: ${options.attachmentName}`] : []),
    ].join('\n');

    return { subject, html, text };
}

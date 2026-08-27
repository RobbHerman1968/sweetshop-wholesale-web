import { escapeHtml } from '@/lib/email/html-utils';
import { formatPhoneDisplay } from '@/lib/checkout-utils';
import type { WholesaleApplicationInput } from '@/lib/validations/wholesale-application';

const BRAND = {
    cream: '#fdf7ef',
    creamLight: '#f8eddf',
    tan: '#d1b79a',
    brown: '#5c4032',
    brownDark: '#3c251a',
    accent: '#f5d9b8',
};

export type WholesaleApplicationEmailContent = {
    subject: string;
    html: string;
    text: string;
};

function row(label: string, value: string): string {
    return `<tr>
      <td style="padding:8px 0;color:${BRAND.brown};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;width:160px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:${BRAND.brownDark};font-size:14px;vertical-align:top;">${value}</td>
    </tr>`;
}

export function buildWholesaleApplicationEmailContent(data: WholesaleApplicationInput): WholesaleApplicationEmailContent {
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
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};color:${BRAND.brownDark};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-collapse:collapse;background:#ffffff;border:1px solid ${BRAND.tan};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px;background:linear-gradient(90deg,#3d2518,#5c3820,#3d2518);color:${BRAND.accent};">
              <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;">Sweet Shop USA Wholesale</p>
              <h1 style="margin:10px 0 0;font-size:22px;font-weight:600;letter-spacing:0.04em;">Apply Now submission</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.brown};">
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
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid ${BRAND.tan};font-size:12px;line-height:1.5;color:#8b6b4a;">
              Sweet Shop USA · Wholesale Support · 1-800-272-0887
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
    ].join('\n');

    return { subject, html, text };
}

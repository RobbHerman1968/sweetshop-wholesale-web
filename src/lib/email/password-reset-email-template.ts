import { escapeHtml } from '@/lib/email/html-utils';

const BRAND = {
    cream: '#fdf7ef',
    creamLight: '#f8eddf',
    tan: '#d1b79a',
    brown: '#5c4032',
    brownDark: '#3c251a',
    accent: '#f5d9b8',
};

export type PasswordResetEmailContent = {
    subject: string;
    html: string;
    text: string;
};

export function buildPasswordResetEmailContent(input: {
    code: string;
    recipientEmail: string;
    expiresInMinutes: number;
}): PasswordResetEmailContent {
    const code = input.code.trim();
    const email = input.recipientEmail.trim();
    const minutes = input.expiresInMinutes;
    const subject = 'Your Sweet Shop USA wholesale password reset code';

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
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-collapse:collapse;background:#ffffff;border:1px solid ${BRAND.tan};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px;background:linear-gradient(90deg,#3d2518,#5c3820,#3d2518);color:${BRAND.accent};">
              <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;">Sweet Shop USA Wholesale</p>
              <h1 style="margin:10px 0 0;font-size:22px;font-weight:600;letter-spacing:0.04em;">Password reset code</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.brown};">
                We received a request to reset the password for <strong style="color:${BRAND.brownDark};">${escapeHtml(email)}</strong>.
              </p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${BRAND.brown};">
                Use this one-time code to continue. It expires in ${minutes} minutes.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 22px;">
                <tr>
                  <td align="center" style="padding:18px;background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;">
                    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:${BRAND.brownDark};">
                      ${escapeHtml(code)}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${BRAND.brown};">
                Enter the code in the password reset window on the wholesale website, then choose a new password.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#7c5b44;">
                If you did not request this reset, you can ignore this email. Your password will remain unchanged.
              </p>
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
        'Sweet Shop USA Wholesale — Password reset code',
        '',
        `We received a request to reset the password for ${email}.`,
        '',
        `Your one-time code: ${code}`,
        `This code expires in ${minutes} minutes.`,
        '',
        'Enter the code in the password reset window, then choose a new password.',
        '',
        'If you did not request this reset, ignore this email.',
        '',
        'Sweet Shop USA · Wholesale Support · 1-800-272-0887',
    ].join('\n');

    return { subject, html, text };
}

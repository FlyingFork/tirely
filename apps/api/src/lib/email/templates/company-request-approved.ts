const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const companyRequestApprovedEmail = (input: {
  companyName: string;
  contactPersonName: string;
  loginEmail: string;
  tempPassword: string;
  signInUrl: string;
}) => ({
  subject: `Welcome to Tirely — ${input.companyName} is approved`,
  html: `<!doctype html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:32px 24px;color:#111827">
  <h1 style="font-size:22px;margin-bottom:8px">Welcome to Tirely</h1>
  <p>Hi ${esc(input.contactPersonName)},</p>
  <p>Great news — <strong>${esc(input.companyName)}</strong> has been approved and your account is ready.</p>
  <p>Use the credentials below to sign in for the first time:</p>
  <table style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;width:100%;border-collapse:collapse;margin:16px 0">
    <tr>
      <td style="padding:4px 0;color:#6b7280;font-size:14px;width:120px">Email</td>
      <td style="padding:4px 0;font-size:14px">${esc(input.loginEmail)}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#6b7280;font-size:14px">Temporary password</td>
      <td style="padding:4px 0"><code style="font-size:14px;background:#e5e7eb;padding:2px 6px;border-radius:4px">${esc(input.tempPassword)}</code></td>
    </tr>
  </table>
  <p style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;font-size:14px;margin:16px 0">
    <strong>Important:</strong> You will be required to set a new password on your first login. Please do not share this temporary password with anyone.
  </p>
  <a href="${esc(input.signInUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;margin:8px 0">Sign in to Tirely</a>
  <p style="color:#6b7280;font-size:13px;margin-top:32px">If you did not request this account, please contact us immediately.</p>
</body>
</html>`,
  text: [
    `Hi ${input.contactPersonName},`,
    ``,
    `Great news — ${input.companyName} has been approved and your account is ready.`,
    ``,
    `Use the credentials below to sign in for the first time:`,
    ``,
    `  Email:             ${input.loginEmail}`,
    `  Temporary password: ${input.tempPassword}`,
    ``,
    `IMPORTANT: You will be required to set a new password on your first login.`,
    `Please do not share this temporary password with anyone.`,
    ``,
    `Sign in: ${input.signInUrl}`,
    ``,
    `If you did not request this account, please contact us immediately.`,
  ].join('\n'),
});

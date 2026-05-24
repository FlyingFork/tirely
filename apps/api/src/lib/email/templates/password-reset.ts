const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const passwordResetEmail = (input: { name: string; url: string }) => ({
  subject: 'Reset your Tirely password',
  html: `<!doctype html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:32px 24px;color:#111827">
  <h1 style="font-size:22px;margin-bottom:8px">Reset your password</h1>
  <p>Hi ${esc(input.name)},</p>
  <p>We received a request to reset the password for your Tirely account. Click the button below to choose a new password.</p>
  <a href="${esc(input.url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;margin:8px 0">Reset password</a>
  <p style="color:#6b7280;font-size:13px;margin-top:16px">This link will expire in 1 hour. If you did not request a password reset, please ignore this email — your password will not be changed.</p>
</body>
</html>`,
  text: [
    `Hi ${input.name},`,
    ``,
    `We received a request to reset the password for your Tirely account.`,
    ``,
    `Reset your password: ${input.url}`,
    ``,
    `This link will expire in 1 hour. If you did not request a password reset, please ignore this email — your password will not be changed.`,
  ].join('\n'),
});

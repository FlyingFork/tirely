const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const companyRequestSubmittedEmail = (input: {
  companyName: string;
  contactPersonName: string;
}) => ({
  subject: `Your Tirely request for ${input.companyName} has been received`,
  html: `<!doctype html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:32px 24px;color:#111827">
  <h1 style="font-size:22px;margin-bottom:8px">Request received</h1>
  <p>Hi ${esc(input.contactPersonName)},</p>
  <p>We've received your request to register <strong>${esc(input.companyName)}</strong> on the Tirely platform.</p>
  <p>Our team will review your submission and get back to you shortly. You'll receive an email once a decision has been made.</p>
  <p style="color:#6b7280;font-size:13px;margin-top:32px">If you did not submit this request, please ignore this email.</p>
</body>
</html>`,
  text: [
    `Hi ${input.contactPersonName},`,
    ``,
    `We've received your request to register ${input.companyName} on the Tirely platform.`,
    ``,
    `Our team will review your submission and get back to you shortly. You'll receive an email once a decision has been made.`,
  ].join('\n'),
});

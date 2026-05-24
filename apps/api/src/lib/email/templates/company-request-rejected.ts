const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const companyRequestRejectedEmail = (input: {
  companyName: string;
  contactPersonName: string;
  rejectionReason?: string | null;
}) => ({
  subject: `Update on your Tirely request for ${input.companyName}`,
  html: `<!doctype html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:32px 24px;color:#111827">
  <h1 style="font-size:22px;margin-bottom:8px">Request update</h1>
  <p>Hi ${esc(input.contactPersonName)},</p>
  <p>Thank you for your interest in joining the Tirely platform. After reviewing your request for <strong>${esc(input.companyName)}</strong>, we are unable to approve it at this time.</p>
  ${input.rejectionReason ? `<p><strong>Reason:</strong> ${esc(input.rejectionReason)}</p>` : ''}
  <p>If you believe this decision was made in error or would like to discuss further, please reply to this email.</p>
  <p style="color:#6b7280;font-size:13px;margin-top:32px">Thank you for your understanding.</p>
</body>
</html>`,
  text: [
    `Hi ${input.contactPersonName},`,
    ``,
    `Thank you for your interest in joining the Tirely platform. After reviewing your request for ${input.companyName}, we are unable to approve it at this time.`,
    ...(input.rejectionReason ? [``, `Reason: ${input.rejectionReason}`] : []),
    ``,
    `If you believe this decision was made in error or would like to discuss further, please reply to this email.`,
  ].join('\n'),
});

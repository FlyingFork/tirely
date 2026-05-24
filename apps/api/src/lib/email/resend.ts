import { Resend } from 'resend';

import type { EmailMessage, EmailService } from './types.js';

type ResendConfig = {
  apiKey: string;
  from: string;
};


function loadResendConfig(): ResendConfig {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error('Resend adapter requires RESEND_API_KEY and EMAIL_FROM env vars');
  }

  return { apiKey, from };
}



function buildResendPayload(from: string, message: EmailMessage) {
  return {
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
  };
}


function assertResendAccepted(result: Awaited<ReturnType<Resend['emails']['send']>>) {
  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
}


export const createResendAdapter = (): EmailService => {
  const config = loadResendConfig();
  const client = new Resend(config.apiKey);

  return {
    async send(message: EmailMessage) {
      const providerResponse = await client.emails.send(buildResendPayload(config.from, message));
      assertResendAccepted(providerResponse);
    },
  };
};

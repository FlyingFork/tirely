import { createConsoleAdapter } from './console.js';
import { createResendAdapter } from './resend.js';
import type { EmailService } from './types.js';

export type { EmailMessage, EmailService } from './types.js';

let _service: EmailService | null = null;

export const buildEmailService = (): EmailService => {
  const provider = process.env.EMAIL_PROVIDER ?? 'console';

  switch (provider) {
    case 'resend':
      return createResendAdapter();
    case 'console':
    default:
      return createConsoleAdapter();
  }
};

export const getEmailService = (): EmailService => {
  if (!_service) {
    _service = buildEmailService();
  }
  return _service;
};

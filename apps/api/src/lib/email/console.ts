import type { EmailMessage, EmailService } from './types.js';

export const createConsoleAdapter = (): EmailService => ({
  async send(message: EmailMessage) {
    console.info(
      JSON.stringify(
        {
          msg: 'email.console',
          to: message.to,
          subject: message.subject,
          text: message.text,
        },
        null,
        2,
      ),
    );
  },
});

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type EmailService = {
  send(message: EmailMessage): Promise<void>;
};

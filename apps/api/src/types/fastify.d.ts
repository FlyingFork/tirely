import type { EmailService } from '../lib/email/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    email: EmailService;
  }
}

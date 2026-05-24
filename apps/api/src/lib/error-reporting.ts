import type { FastifyBaseLogger } from 'fastify';

type ErrorSeverity = 'error' | 'warning';

interface ErrorReport {
  source: 'api' | 'web';
  severity: ErrorSeverity;
  message: string;
  requestId?: string;
  path?: string;
  method?: string;
  stack?: string;
  digest?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

const ERROR_REPORT_TIMEOUT_MS = 3000;

export const reportError = async (logger: FastifyBaseLogger, report: ErrorReport) => {
  const webhookUrl = process.env.ERROR_REPORT_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.error({ errorReport: report }, 'error.report');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ERROR_REPORT_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.error(
        { statusCode: response.status, errorReport: report },
        'Error report webhook rejected payload',
      );
    }
  } catch (err) {
    logger.error({ err, errorReport: report }, 'Failed to send error report webhook');
  } finally {
    clearTimeout(timeout);
  }
};

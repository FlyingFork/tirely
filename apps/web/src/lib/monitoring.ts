const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const reportClientError = (error: Error & { digest?: string }) => {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify({
    message: error.message || 'Unknown client error',
    stack: error.stack,
    digest: error.digest,
    path: window.location.href,
    userAgent: window.navigator.userAgent,
  });

  const url = `${API_BASE_URL}/v1/monitoring/client-error`;
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  });
};

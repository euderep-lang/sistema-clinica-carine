/**
 * Monitoramento de erros via Sentry (opcional — configure SENTRY_DSN).
 * Client-side only; server errors are logged to console and audit log.
 */
declare global {
  interface Window {
    __sentryInitialized?: boolean;
  }
}

export function initSentry() {
  if (typeof window === "undefined") return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn?.trim() || window.__sentryInitialized) return;

  void import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 0,
      });
      window.__sentryInitialized = true;
    })
    .catch(() => {
      /* Sentry optional — skip if package not installed */
    });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.__sentryInitialized) return;
  void import("@sentry/react").then((Sentry) => {
    Sentry.captureException(error, { extra: context });
  });
}

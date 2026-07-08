import type { CapAlert } from '../types';

/** Alerts without an expiry are considered current for this long after being sent. */
const NO_EXPIRY_TTL_MS = 24 * 60 * 60 * 1000;

/** A real (non-test, non-cancelled) alert, regardless of whether it has expired. */
export function isActualAlert(alert: CapAlert): boolean {
  return alert.status === 'Actual' && alert.msgType !== 'Cancel';
}

/**
 * A currently effective alert: the NCDR feed keeps historical entries,
 * so anything past its <cap:expires> must be filtered out.
 */
export function isCurrentAlert(alert: CapAlert, now: Date = new Date()): boolean {
  if (!isActualAlert(alert)) return false;

  const expiries = alert.info
    .map((i) => i.expires)
    .filter((d): d is Date => d !== null);

  if (expiries.length > 0) {
    return expiries.some((d) => d.getTime() > now.getTime());
  }
  // No expiry in the data — only trust it while it is fresh.
  return now.getTime() - alert.sent.getTime() < NO_EXPIRY_TTL_MS;
}

/** Most recent `sent` time among the given alerts, or null when empty. */
export function latestSentTime(alerts: CapAlert[]): Date | null {
  return alerts.reduce<Date | null>(
    (best, a) => (!best || a.sent > best ? a.sent : best),
    null,
  );
}

/**
 * Coordinates enter-hub vs leave-hub so a late enter cannot restick hubId (Phase 8.4).
 * Abort in-flight enter when leaving; BE hubRevision is the second line of defense.
 */

let enterAbort: AbortController | null = null;

/** Abort any in-flight enter-hub and return a fresh signal for the next enter. */
export function beginHubEnter(): AbortSignal {
  enterAbort?.abort();
  enterAbort = new AbortController();
  return enterAbort.signal;
}

/** Abort any in-flight enter-hub (call before leave-hub / X Leave). */
export function abortHubEnter(): void {
  enterAbort?.abort();
  enterAbort = null;
}

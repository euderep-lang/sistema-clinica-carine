/** Badge no ícone do PWA (Badging API — Chrome/Edge/Android). */

export function syncCrmAppBadge(count: number): void {
  if (typeof window === "undefined") return;

  const safe = Math.max(0, Math.floor(count));

  if ("setAppBadge" in navigator) {
    if (safe > 0) {
      void (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(safe);
    } else {
      void (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
    }
  }

  navigator.serviceWorker?.controller?.postMessage({ type: "wa-badge", count: safe });
}

export function clearCrmAppBadge(): void {
  syncCrmAppBadge(0);
}

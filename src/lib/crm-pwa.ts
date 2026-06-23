import type { Role } from "@/lib/mock-auth";
import { dashboardPathFor } from "@/lib/mock-auth";

export const CRM_PWA_SESSION_KEY = "clinicos-crm-pwa";
export const CRM_PWA_THEME = "#075E54";

/** Detecta app instalado (Android PWA ou iOS Add to Home Screen). */
export function isCrmStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mq || ios;
}

export function markCrmPwaSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(CRM_PWA_SESSION_KEY, "1");
}

export function hasCrmPwaSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(CRM_PWA_SESSION_KEY) === "1";
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function shouldUseCrmPwaExperience(): boolean {
  if (typeof window === "undefined") return false;
  if (isCrmStandalone()) return true;
  return hasCrmPwaSession() && isMobileViewport();
}

export function canAccessCrm(role: Role): boolean {
  return role === "admin" || role === "receptionist" || role === "professional";
}

export function postLoginPathForRole(role: Role): string {
  if (canAccessCrm(role) && shouldUseCrmPwaExperience()) {
    return "/crm/inbox";
  }
  return dashboardPathFor(role);
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function captureCrmInstallPrompt(e: Event): void {
  e.preventDefault();
  deferredInstallPrompt = e as BeforeInstallPromptEvent;
}

export function getCrmInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

export async function promptCrmInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredInstallPrompt) return "unavailable";
  await deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === "accepted") deferredInstallPrompt = null;
  return outcome;
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

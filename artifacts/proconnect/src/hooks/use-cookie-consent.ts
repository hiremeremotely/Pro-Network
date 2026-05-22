import { useState, useCallback } from "react";

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
}

const STORAGE_KEY = "hmr_cookie_consent";

function readConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

function writeConsent(c: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

const ALL_ACCEPTED: CookieConsent = { necessary: true, analytics: true, marketing: true, decided: true };
const NECESSARY_ONLY: CookieConsent = { necessary: true, analytics: false, marketing: false, decided: true };

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent>(() => readConsent() ?? { necessary: true, analytics: false, marketing: false, decided: false });
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const acceptAll = useCallback(() => {
    writeConsent(ALL_ACCEPTED);
    setConsent(ALL_ACCEPTED);
    setPreferencesOpen(false);
  }, []);

  const acceptNecessaryOnly = useCallback(() => {
    writeConsent(NECESSARY_ONLY);
    setConsent(NECESSARY_ONLY);
    setPreferencesOpen(false);
  }, []);

  const updateConsent = useCallback((patch: Partial<Pick<CookieConsent, "analytics" | "marketing">>) => {
    const next: CookieConsent = { necessary: true, analytics: patch.analytics ?? consent.analytics, marketing: patch.marketing ?? consent.marketing, decided: true };
    writeConsent(next);
    setConsent(next);
    setPreferencesOpen(false);
  }, [consent]);

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  return {
    consent,
    hasDecided: consent.decided,
    acceptAll,
    acceptNecessaryOnly,
    updateConsent,
    preferencesOpen,
    openPreferences,
    closePreferences,
  };
}

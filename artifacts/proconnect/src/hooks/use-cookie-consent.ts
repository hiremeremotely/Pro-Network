/**
 * useCookieConsent — reads and writes cookie consent preferences to localStorage.
 *
 * Backed by a module-level store so all components share the same state instance.
 * This means ManageCookiesLink (in footer) and CookieConsent (banner/modal) both
 * react to the same preferencesOpen flag.
 *
 * Preference shape: { necessary: true, analytics: boolean, marketing: boolean, decided: boolean }
 *
 * Usage — gate analytics loaders behind consent:
 *
 *   const { consent } = useCookieConsent();
 *
 *   useEffect(() => {
 *     if (consent.analytics) { loadGoogleAnalytics(); }
 *     if (consent.marketing) { loadMetaPixel(); loadLinkedInInsightTag(); }
 *   }, [consent.analytics, consent.marketing]);
 *
 * Only fire analytics scripts AFTER consent.analytics / consent.marketing are true.
 * Never load tracking scripts before the user has made a choice (consent.decided === false).
 */

import { useSyncExternalStore, useCallback } from "react";

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
}

// ── Module-level store ─────────────────────────────────────────────────────────

const STORAGE_KEY = "hmr_cookie_consent";

function readFromStorage(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

function writeToStorage(c: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

interface StoreState {
  consent: CookieConsent;
  preferencesOpen: boolean;
}

const DEFAULT_CONSENT: CookieConsent = { necessary: true, analytics: false, marketing: false, decided: false };
const ALL_ACCEPTED: CookieConsent = { necessary: true, analytics: true, marketing: true, decided: true };
const NECESSARY_ONLY: CookieConsent = { necessary: true, analytics: false, marketing: false, decided: true };

let store: StoreState = {
  consent: readFromStorage() ?? DEFAULT_CONSENT,
  preferencesOpen: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function getSnapshot(): StoreState {
  return store;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(next: StoreState) {
  store = next;
  listeners.forEach(l => l());
}

// ── Actions ────────────────────────────────────────────────────────────────────

function acceptAll() {
  writeToStorage(ALL_ACCEPTED);
  setState({ consent: ALL_ACCEPTED, preferencesOpen: false });
}

function acceptNecessaryOnly() {
  writeToStorage(NECESSARY_ONLY);
  setState({ consent: NECESSARY_ONLY, preferencesOpen: false });
}

function updateConsent(patch: Partial<Pick<CookieConsent, "analytics" | "marketing">>) {
  const next: CookieConsent = {
    necessary: true,
    analytics: patch.analytics ?? store.consent.analytics,
    marketing: patch.marketing ?? store.consent.marketing,
    decided: true,
  };
  writeToStorage(next);
  setState({ consent: next, preferencesOpen: false });
}

function openPreferences() {
  setState({ ...store, preferencesOpen: true });
}

function closePreferences() {
  setState({ ...store, preferencesOpen: false });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useCookieConsent() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  /**
   * consentTo(category) — returns true if the user has consented to the given category.
   * Use as a guard before loading any third-party script:
   *
   *   if (consentTo("analytics")) { loadGoogleAnalytics(); }
   */
  const consentTo = useCallback((category: "analytics" | "marketing"): boolean => {
    return snap.consent.decided ? snap.consent[category] : false;
  }, [snap.consent]);

  return {
    consent: snap.consent,
    hasDecided: snap.consent.decided,
    consentTo,
    preferencesOpen: snap.preferencesOpen,
    acceptAll,
    acceptNecessaryOnly,
    updateConsent,
    openPreferences,
    closePreferences,
  };
}

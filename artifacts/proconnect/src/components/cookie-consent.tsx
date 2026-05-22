import { useState } from "react";
import { useLocation } from "wouter";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheckIcon, XIcon } from "lucide-react";

const BO_ROUTES = ["/bo", "/bo/dashboard"];

export function CookieConsent() {
  const [location] = useLocation();
  const {
    consent,
    hasDecided,
    acceptAll,
    acceptNecessaryOnly,
    updateConsent,
    preferencesOpen,
    openPreferences,
    closePreferences,
  } = useCookieConsent();

  const [draft, setDraft] = useState({ analytics: consent.analytics, marketing: consent.marketing });

  if (BO_ROUTES.some(r => location.startsWith(r))) return null;

  function handleSavePreferences() {
    updateConsent(draft);
  }

  return (
    <>
      {!hasDecided && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <ShieldCheckIcon className="w-6 h-6 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 mb-0.5">We use cookies</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                We use essential cookies to keep you signed in. We'd also like to use analytics cookies to improve the platform.{" "}
                <button onClick={openPreferences} className="text-primary hover:underline font-medium">Manage preferences</button>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <Button variant="outline" size="sm" onClick={acceptNecessaryOnly} className="rounded-full text-xs h-8 px-4">
                Necessary only
              </Button>
              <Button size="sm" onClick={acceptAll} className="rounded-full text-xs h-8 px-5">
                Accept all
              </Button>
            </div>
          </div>
        </div>
      )}

      {preferencesOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closePreferences} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-gray-900">Cookie preferences</h2>
              </div>
              <button onClick={closePreferences} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Necessary</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Required for authentication and core platform features. Cannot be disabled.
                  </p>
                </div>
                <Switch checked disabled className="mt-0.5 flex-shrink-0 opacity-60" />
              </div>

              <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Analytics</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Help us understand how the platform is used so we can improve it. No personal data is sold.
                  </p>
                </div>
                <Switch
                  checked={draft.analytics}
                  onCheckedChange={v => setDraft(d => ({ ...d, analytics: v }))}
                  className="mt-0.5 flex-shrink-0"
                />
              </div>

              <div className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Marketing</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Allow us to show relevant content and measure the effectiveness of campaigns.
                  </p>
                </div>
                <Switch
                  checked={draft.marketing}
                  onCheckedChange={v => setDraft(d => ({ ...d, marketing: v }))}
                  className="mt-0.5 flex-shrink-0"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={acceptNecessaryOnly} className="flex-1 rounded-full text-xs">
                Necessary only
              </Button>
              <Button size="sm" onClick={handleSavePreferences} className="flex-1 rounded-full text-xs">
                Save preferences
              </Button>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
              You can change these settings any time via "Manage cookies" in the footer.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function ManageCookiesLink() {
  const [location] = useLocation();
  const { openPreferences } = useCookieConsent();

  if (BO_ROUTES.some(r => location.startsWith(r))) return null;

  return (
    <button onClick={openPreferences} className="hover:text-gray-700 transition-colors">
      Manage cookies
    </button>
  );
}

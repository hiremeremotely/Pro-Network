import { useState, useEffect } from "react";
import { useParams } from "wouter";
import logo from "@assets/hr_1775483051104.png";

const BASE = import.meta.env.BASE_URL;

interface OfferLetterData {
  id: number;
  token: string;
  status: string;
  renderedHtml: string;
  sentAt: string | null;
  signedAt: string | null;
  jobTitle: string | null;
  companyName: string | null;
  candidateName: string | null;
}

export default function OfferPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [offer, setOffer] = useState<OfferLetterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetch(`${BASE}api/offer-letters/${token}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setOffer(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(response: "accepted" | "declined") {
    if (!token || responding) return;
    setResponding(true);
    try {
      const res = await fetch(`${BASE}api/offer-letters/${token}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (res.ok) {
        setResponded(response);
        if (offer) setOffer({ ...offer, status: response });
      }
    } catch {
      // ignore
    } finally {
      setResponding(false);
    }
  }

  const alreadyResponded = offer && ["accepted", "declined"].includes(offer.status);
  const finalResponse = responded ?? (alreadyResponded ? offer!.status as "accepted" | "declined" : null);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <img src={logo} alt="Hire Me Remotely" className="h-8 w-auto" />
        <span className="text-sm text-gray-400 font-medium">Offer Letter</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {loading && (
          <div className="flex items-center justify-center py-32 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading offer letter…
          </div>
        )}

        {!loading && notFound && (
          <div className="text-center py-32">
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Offer not found</h1>
            <p className="text-gray-500 text-sm">This link may have expired or is no longer valid.</p>
          </div>
        )}

        {!loading && offer && (
          <>
            {/* Title block */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {offer.jobTitle ? `Offer of Employment — ${offer.jobTitle}` : "Offer of Employment"}
              </h1>
              {offer.companyName && (
                <p className="text-gray-500 mt-1">from <span className="font-semibold text-gray-700">{offer.companyName}</span></p>
              )}
              {offer.sentAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Sent {new Date(offer.sentAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>

            {/* Letter content */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
              <div
                className="p-8"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "14px", lineHeight: "1.8", color: "#1a1a1a" }}
                dangerouslySetInnerHTML={{ __html: offer.renderedHtml }}
              />
            </div>

            {/* Response area */}
            {finalResponse ? (
              <div className={`rounded-2xl border-2 p-8 text-center ${
                finalResponse === "accepted"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="text-4xl mb-3">{finalResponse === "accepted" ? "✅" : "❌"}</div>
                <h2 className={`text-xl font-bold mb-2 ${finalResponse === "accepted" ? "text-green-800" : "text-red-800"}`}>
                  {finalResponse === "accepted" ? "Offer Accepted!" : "Offer Declined"}
                </h2>
                <p className={`text-sm ${finalResponse === "accepted" ? "text-green-700" : "text-red-700"}`}>
                  {finalResponse === "accepted"
                    ? `You've accepted the offer${offer.jobTitle ? ` for ${offer.jobTitle}` : ""}. ${offer.companyName ?? "The team"} will be in touch soon with next steps.`
                    : "You've declined this offer. No further action is needed."}
                </p>
                {offer.signedAt && (
                  <p className="text-xs text-gray-400 mt-3">
                    Responded on {new Date(offer.signedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Your response</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Please review the offer letter above carefully before responding.
                  {offer.candidateName ? ` This offer is addressed to ${offer.candidateName}.` : ""}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => respond("accepted")}
                    disabled={responding}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-60 text-sm"
                  >
                    {responding ? "Processing…" : "✓ Accept Offer"}
                  </button>
                  <button
                    onClick={() => respond("declined")}
                    disabled={responding}
                    className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-60 text-sm"
                  >
                    Decline
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Your response will be shared with {offer.companyName ?? "the employer"}.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-8">
        <img src={logo} alt="Hire Me Remotely" className="h-5 w-auto mx-auto mb-2 opacity-50" />
        Powered by Hire Me Remotely · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, CheckCircleIcon, MailIcon, CopyIcon } from "lucide-react";
import logo from "@assets/hmr_logo.png";

const BASE = import.meta.env.BASE_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.resetToken) {
        const url = `${window.location.origin}${import.meta.env.BASE_URL}reset-password?token=${data.resetToken}`;
        setResetLink(url);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(resetLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center">
        <Link href="/">
          <img src={logo} alt="Hire Me Remotely" className="h-10 w-auto" />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {!resetLink ? (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <MailIcon className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password?</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-11"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                    <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-11 rounded-full font-semibold text-base">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : "Send reset link"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-5">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Reset link ready</h1>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
                <p className="text-xs font-semibold text-amber-800 mb-1">Demo mode</p>
                <p className="text-xs text-amber-700">In production this link would be emailed to you. Copy it below to reset your password.</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 break-all text-xs text-gray-700 font-mono">
                {resetLink}
              </div>
              <Button onClick={copyLink} variant="outline" className="w-full h-10 rounded-full font-semibold gap-2 mb-4">
                <CopyIcon className="w-4 h-4" />
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <Button
                className="w-full h-10 rounded-full font-semibold"
                onClick={() => window.location.href = resetLink}
              >
                Open reset page
              </Button>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

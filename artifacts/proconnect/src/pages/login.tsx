import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, AlertCircleIcon, BuildingIcon, CheckCircleIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import logo from "@assets/hr_1775483051104.png";
import { PageSEO } from "@/components/page-seo";

const BASE = import.meta.env.BASE_URL;

export default function Login() {
  const { user, login } = useAppAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState(() => {
    const prefill = sessionStorage.getItem("login_prefill_email") ?? "";
    sessionStorage.removeItem("login_prefill_email");
    return prefill;
  });
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendLink, setResendLink] = useState("");
  const [resendCopied, setResendCopied] = useState(false);
  const [verifiedBanner] = useState(() => new URLSearchParams(window.location.search).get("verified") === "1");

  useEffect(() => {
    if (!user) return;
    if (user.accountType === "company") {
      const isOnboarding = sessionStorage.getItem("hmr_company_onboarding") === "1";
      if (isOnboarding) {
        sessionStorage.removeItem("hmr_company_onboarding");
        navigate("/profile/edit?onboarding=true");
      } else {
        navigate("/company-dashboard");
      }
    } else {
      navigate("/feed");
    }
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUnverified(false);
    setResendLink("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    const result = await login(email, password, "individual");
    setLoading(false);
    if (result.ok) {
      navigate("/feed");
    } else {
      if (result.unverified) setUnverified(true);
      setError(result.error ?? "Login failed.");
    }
  }

  async function handleResend() {
    setResendLink("");
    setResendLoading(true);
    try {
      const res = await fetch(`${BASE}api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.verificationToken) {
        const link = `${window.location.origin}${import.meta.env.BASE_URL}verify-email?token=${data.verificationToken}`;
        setResendLink(link);
      } else {
        setError(data.error ?? "Could not resend. Please try again.");
      }
    } catch {
      setError("Server unreachable. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  function copyResendLink() {
    navigator.clipboard.writeText(resendLink).then(() => {
      setResendCopied(true);
      setTimeout(() => setResendCopied(false), 2000);
    });
  }

  return (
    <>
    <PageSEO title="Sign In" noIndex />
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center">
        <Link href="/">
          <img src={logo} alt="Hire Me Remotely" className="h-10 w-auto" />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {verifiedBanner && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-5">
              <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 font-medium">Email verified! You can now sign in.</p>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-6">Stay updated with your professional world.</p>

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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
                {unverified && (
                  <div className="mt-3 pl-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={resendLoading}
                      onClick={handleResend}
                      className="h-8 px-3 rounded-full text-xs font-semibold text-primary hover:bg-primary/10 gap-1.5 -ml-2"
                    >
                      <RefreshCwIcon className={`w-3 h-3 ${resendLoading ? "animate-spin" : ""}`} />
                      {resendLoading ? "Generating link…" : "Resend verification link"}
                    </Button>
                    {resendLink && (
                      <div className="mt-2">
                        <div className="bg-white border border-gray-200 rounded-lg p-2 mb-2 break-all text-[10px] text-gray-600 font-mono">
                          {resendLink}
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={copyResendLink} className="h-7 px-2.5 rounded-full text-xs gap-1">
                            <CopyIcon className="w-3 h-3" />
                            {resendCopied ? "Copied!" : "Copy"}
                          </Button>
                          <Button type="button" size="sm" onClick={() => window.location.href = resendLink} className="h-7 px-2.5 rounded-full text-xs">
                            Open link
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 rounded-full font-semibold text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign in"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400">New to Hire Me Remotely?</span></div>
          </div>

          <Button
            variant="outline"
            className="w-full h-11 rounded-full font-semibold border-primary text-primary hover:bg-primary/5"
            onClick={() => {
              sessionStorage.setItem("signup_prefill_type", "individual");
              sessionStorage.setItem("signup_lock_type", "true");
              navigate("/signup");
            }}
          >
            Join now
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400">Signing in as a company?</span></div>
          </div>

          <Link href="/company-login">
            <Button variant="ghost" className="w-full h-10 rounded-full font-semibold text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-gray-200 flex items-center gap-2">
              <BuildingIcon className="w-4 h-4" />
              Company sign-in
            </Button>
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, CheckCircleIcon, MailIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import logo from "@assets/hmr_logo.png";

const BASE = import.meta.env.BASE_URL;

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const emailFromSession = sessionStorage.getItem("verify_email_address") ?? "";
  const tokenFromSession = sessionStorage.getItem("verify_token") ?? "";

  const [verifyLink, setVerifyLink] = useState(() => {
    if (tokenFromSession) {
      return `${window.location.origin}${import.meta.env.BASE_URL}verify-email?token=${tokenFromSession}`;
    }
    return "";
  });

  const [copied, setCopied] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState("");
  const [resendDone, setResendDone] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyDone, setVerifyDone] = useState(false);
  const verifyCalledRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (verifyCalledRef.current) return;
    verifyCalledRef.current = true;

    setVerifying(true);
    fetch(`${BASE}api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.authToken) {
          sessionStorage.removeItem("verify_email_address");
          sessionStorage.removeItem("verify_token");
          setVerifyDone(true);
          setTimeout(() => navigate("/login?verified=1"), 2000);
        } else {
          setVerifyError(data.error ?? "Verification failed.");
        }
      })
      .catch(() => setVerifyError("Server unreachable. Please try again."))
      .finally(() => setVerifying(false));
  }, [token]);

  function copyLink() {
    navigator.clipboard.writeText(verifyLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleResend() {
    setResendError("");
    setResendDone(false);
    if (!emailFromSession) { setResendError("Email address not found. Please sign up again."); return; }
    setResendLoading(true);
    try {
      const res = await fetch(`${BASE}api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailFromSession }),
      });
      const data = await res.json();
      if (res.ok && data.verificationToken) {
        const newLink = `${window.location.origin}${import.meta.env.BASE_URL}verify-email?token=${data.verificationToken}`;
        sessionStorage.setItem("verify_token", data.verificationToken);
        setVerifyLink(newLink);
        setResendDone(true);
      } else {
        setResendError(data.error ?? "Could not resend. Please try again.");
      }
    } catch {
      setResendError("Server unreachable. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  if (token) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center">
          <Link href="/">
            <img src={logo} alt="Hire Me Remotely" className="h-12 w-auto" />
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            {verifying && (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5 mx-auto">
                  <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying your email…</h1>
                <p className="text-sm text-gray-500">Just a moment.</p>
              </>
            )}

            {verifyDone && (
              <>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-5 mx-auto">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h1>
                <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
              </>
            )}

            {verifyError && (
              <>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-5 mx-auto">
                  <AlertCircleIcon className="w-6 h-6 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h1>
                <p className="text-sm text-red-600 mb-6">{verifyError}</p>
                <Link href="/signup">
                  <Button className="w-full h-11 rounded-full font-semibold">Create a new account</Button>
                </Link>
                <p className="text-center text-sm text-gray-500 mt-4">
                  <Link href="/login" className="text-primary font-semibold hover:underline">Back to sign in</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center">
        <Link href="/">
          <img src={logo} alt="Hire Me Remotely" className="h-12 w-auto" />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <MailIcon className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Verify your email</h1>
          <p className="text-sm text-gray-500 mb-5">
            {emailFromSession
              ? <>A verification link has been generated for <span className="font-medium text-gray-700">{emailFromSession}</span>. Use it below to activate your account.</>
              : "Use the verification link below to activate your account."}
          </p>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
            <p className="text-xs font-semibold text-amber-800 mb-1">Demo mode</p>
            <p className="text-xs text-amber-700">In production this link would be emailed to you. Copy it below to verify your account.</p>
          </div>

          {verifyLink && (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 break-all text-xs text-gray-700 font-mono">
                {verifyLink}
              </div>
              <Button onClick={copyLink} variant="outline" className="w-full h-10 rounded-full font-semibold gap-2 mb-2">
                <CopyIcon className="w-4 h-4" />
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <Button
                className="w-full h-10 rounded-full font-semibold mb-5"
                onClick={() => window.location.href = verifyLink}
              >
                Open verification link
              </Button>
            </>
          )}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-2">Didn't receive it? Generate a new link.</p>
            <Button
              variant="ghost"
              size="sm"
              disabled={resendLoading}
              onClick={handleResend}
              className="w-full h-9 rounded-full text-sm font-semibold text-primary hover:bg-primary/5 gap-2"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${resendLoading ? "animate-spin" : ""}`} />
              {resendLoading ? "Generating…" : "Resend verification link"}
            </Button>
            {resendDone && (
              <p className="text-xs text-green-600 text-center mt-2">New link generated above.</p>
            )}
            {resendError && (
              <p className="text-xs text-red-600 text-center mt-2">{resendError}</p>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            <Link href="/login" className="text-primary font-semibold hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

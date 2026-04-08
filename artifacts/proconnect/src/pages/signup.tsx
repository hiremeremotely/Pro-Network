import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, AlertCircleIcon, UserIcon, BuildingIcon } from "lucide-react";
import logo from "@assets/hr_1775483051104.png";

export default function Signup() {
  const { user, signup } = useAppAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => {
    const prefill = sessionStorage.getItem("signup_prefill_email") ?? "";
    if (prefill) sessionStorage.removeItem("signup_prefill_email");
    return prefill;
  });
  const [password, setPassword] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/feed");
  }, [user, navigate]);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) { setError("All fields are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signup({ name, email, password, accountType, headline, location });
    setLoading(false);
    if (result.ok) navigate("/feed");
    else setError(result.error ?? "Registration failed.");
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <img src={logo} alt="Hire Me Remotely" className="h-10 w-auto" />
        </Link>
        <p className="text-sm text-gray-500">
          Already on Hire Me Remotely?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Make the most of your career</h1>
              <p className="text-sm text-gray-500 mb-6">Create your free account to get started.</p>

              {/* Account type toggle */}
              <div className="flex gap-2 mb-5">
                {(["individual", "company"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAccountType(t)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      accountType === t
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {t === "individual" ? <UserIcon className="w-4 h-4" /> : <BuildingIcon className="w-4 h-4" />}
                    {t === "individual" ? "Individual" : "Company"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {accountType === "company" ? "Company name" : "Full name"}
                  </label>
                  <Input placeholder={accountType === "company" ? "Acme Inc." : "Alex Chen"} value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="6+ characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                    <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 rounded-full font-semibold text-base">
                  Continue
                </Button>
              </form>

              <p className="text-xs text-gray-400 mt-4 text-center">
                By continuing you agree to our{" "}
                <span className="text-primary cursor-pointer hover:underline">Terms</span> and{" "}
                <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
              </p>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                ← Back
              </button>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Add a few details</h1>
              <p className="text-sm text-gray-500 mb-6">Help others know who you are.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {accountType === "company" ? "Company tagline" : "Professional headline"}
                  </label>
                  <Input
                    placeholder={accountType === "company" ? "Build tools developers love" : "Full-Stack Engineer | React & Node.js"}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-gray-400">(optional)</span></label>
                  <Input placeholder="San Francisco, CA (Remote)" value={location} onChange={(e) => setLocation(e.target.value)} className="h-11" />
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
                      Creating account...
                    </span>
                  ) : "Create account"}
                </Button>
                <Button type="button" variant="ghost" onClick={handleSubmit} className="w-full text-sm text-gray-400 hover:text-gray-600" disabled={loading}>
                  Skip for now
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

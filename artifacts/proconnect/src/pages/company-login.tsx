import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EyeIcon, EyeOffIcon, AlertCircleIcon, BuildingIcon } from "lucide-react";
import logo from "@assets/hr_1775483051104.png";

export default function CompanyLogin() {
  const { user, login } = useAppAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.accountType === "company" ? "/company-dashboard" : "/feed");
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    const result = await login(email, password, "company");
    setLoading(false);
    if (result.ok) {
      navigate("/company-dashboard");
    } else {
      setError(result.error ?? "Login failed.");
    }
  }

  function handleRegister() {
    sessionStorage.setItem("signup_prefill_type", "company");
    sessionStorage.setItem("signup_lock_type", "true");
    navigate("/signup");
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <img src={logo} alt="Hire Me Remotely" className="h-10 w-auto" />
        </Link>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="text-sm text-gray-500 hover:text-gray-900 font-medium">
            Professional sign-in
          </Button>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BuildingIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Company sign-in</h1>
              <p className="text-xs text-gray-400">Access your HR hub and talent tools</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work email</label>
              <Input
                type="email"
                placeholder="company@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
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

            <Button type="submit" disabled={loading} className="w-full h-11 rounded-full font-semibold text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : "Sign in"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400">New to Hire Me Remotely?</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-11 rounded-full font-semibold border-primary text-primary hover:bg-primary/5 flex items-center gap-2"
            onClick={handleRegister}
          >
            <BuildingIcon className="w-4 h-4" />
            Register your company
          </Button>

          <Separator className="my-5" />

          <p className="text-center text-xs text-gray-400">
            Not a company?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in as a professional
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

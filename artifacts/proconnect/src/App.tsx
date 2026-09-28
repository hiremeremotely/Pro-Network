import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { BoAuthProvider, useBoAuth } from "@/contexts/bo-auth";
import { AppAuthProvider, useAppAuth } from "@/contexts/app-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import CompanyLogin from "@/pages/company-login";
import Signup from "@/pages/signup";
import Feed from "@/pages/feed";
import Profiles from "@/pages/profiles";
import ProfileDetail from "@/pages/profile-detail";
import ProfileEdit from "@/pages/profile-edit";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Applications from "@/pages/applications";
import BoLogin from "@/pages/bo-login";
import Admin from "@/pages/admin";
import CompanyDashboard from "@/pages/company-dashboard";
import Notifications from "@/pages/notifications";
import Messaging from "@/pages/messaging";
import MyItems from "@/pages/my-items";
import Analytics from "@/pages/analytics";
import SalaryEstimator from "@/pages/salary-estimator";
import MyWork from "@/pages/my-work";
import JobTracker from "@/pages/job-tracker";
import CompanyInterests from "@/pages/company-interests";
import ProfessionalRequests from "@/pages/professional-requests";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import OfferPage from "@/pages/offer-page";
import { CookieConsent } from "@/components/cookie-consent";
import { ClerkProvider, SignIn, SignUp, useAuth, useUser, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ClerkBridge() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { establishSession } = useAppAuth();
  const [location, navigate] = useLocation();
  const bridgedUser = useRef<string | null>(null);

  useEffect(() => {
    const onLogout = () => { void signOut(); };
    window.addEventListener("proconnect:clerk-logout", onLogout);
    return () => window.removeEventListener("proconnect:clerk-logout", onLogout);
  }, [signOut]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || bridgedUser.current === user.id) return;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}api/auth/clerk-bridge`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.profile) throw new Error(data.error ?? "Could not connect your account.");
        if (cancelled) return;
        bridgedUser.current = user.id;
        establishSession({
          id: data.profile.id,
          name: data.profile.name,
          email: data.profile.email,
          accountType: data.profile.accountType,
          headline: data.profile.headline,
          bio: data.profile.bio,
          avatarUrl: data.profile.avatarUrl,
          authToken: data.authToken,
        });
        const isAuthEntry =
          location === "/" ||
          location === "/login" ||
          location.startsWith("/sign-in") ||
          location.startsWith("/sign-up");
        if (isAuthEntry) {
          navigate(data.profile.accountType === "company" ? "/company-dashboard" : "/job-tracker");
        }
      })
      .catch(() => {
        if (!cancelled) bridgedUser.current = null;
      });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, user, establishSession, location, navigate]);

  return null;
}

// ── Auth guards ───────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAppAuth();
  const [, navigate] = useLocation();

  useLayoutEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [user, isLoading, navigate]);

  if (isLoading) return null;
  if (!user) return null;
  return <>{children}</>;
}

function RequireIndividual({ children }: { children: ReactNode }) {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();

  useLayoutEffect(() => {
    if (user && user.accountType === "company") navigate("/company-dashboard");
  }, [user, navigate]);

  if (user?.accountType === "company") return null;
  return <>{children}</>;
}

function RequireBoAuth({ children }: { children: ReactNode }) {
  const { session } = useBoAuth();
  const [, navigate] = useLocation();

  useLayoutEffect(() => {
    if (!session) navigate("/bo");
  }, [session, navigate]);

  if (!session) return null;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();

  useLayoutEffect(() => {
    if (user) {
      navigate(user.accountType === "company" ? "/company-dashboard" : "/job-tracker");
    }
  }, [user, navigate]);

  if (user) return null;
  return <>{children}</>;
}

// ── Router ────────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      {/* Clerk OAuth callback routes must retain the optional wildcard exactly. */}
      <Route path="/sign-in/*?">
        <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center px-4">
          <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        </div>
      </Route>
      <Route path="/sign-up/*?">
        <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center px-4">
          <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        </div>
      </Route>
      {/* Public — redirect to app if already logged in */}
      <Route path="/">
        <RedirectIfAuth><Landing /></RedirectIfAuth>
      </Route>
      <Route path="/login">
        <RedirectIfAuth><Login /></RedirectIfAuth>
      </Route>
      <Route path="/company-login">
        <RedirectIfAuth><CompanyLogin /></RedirectIfAuth>
      </Route>
      <Route path="/signup">
        <RedirectIfAuth><Signup /></RedirectIfAuth>
      </Route>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/offer/:token" component={OfferPage} />

      {/* Backoffice login (public) */}
      <Route path="/bo" component={BoLogin} />

      {/* Backoffice dashboard — requires BO session */}
      <Route path="/bo/dashboard">
        <RequireBoAuth>
          <Admin />
        </RequireBoAuth>
      </Route>

      {/* Company dashboard — requires auth but uses its own layout (no global nav) */}
      <Route path="/company-dashboard">
        <RequireAuth>
          <CompanyDashboard />
        </RequireAuth>
      </Route>

      {/* Profile edit — standalone route; component handles its own layout per account type */}
      <Route path="/profile/edit">
        <RequireAuth>
          <ProfileEdit />
        </RequireAuth>
      </Route>

      {/* Public browseable pages — accessible without login */}
      <Route path="/profiles">
        <Layout><Profiles /></Layout>
      </Route>
      <Route path="/profiles/:id">
        <Layout><ProfileDetail /></Layout>
      </Route>
      <Route path="/jobs">
        <Layout><Jobs /></Layout>
      </Route>
      <Route path="/jobs/:id">
        <Layout><JobDetail /></Layout>
      </Route>

      {/* All main-app pages — require user session */}
      <Route>
        <RequireAuth>
          <Layout>
            <Switch>
              <Route path="/feed"><RequireIndividual><Feed /></RequireIndividual></Route>
              <Route path="/applications"><RequireIndividual><Applications /></RequireIndividual></Route>
              <Route path="/notifications" component={Notifications} />
              <Route path="/messaging" component={Messaging} />
              <Route path="/my-items" component={MyItems} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/salary-estimator" component={SalaryEstimator} />
              <Route path="/my-work" component={MyWork} />
              <Route path="/job-tracker">
                <RequireIndividual><JobTracker /></RequireIndividual>
              </Route>
              <Route path="/professional-requests"><RequireIndividual><ProfessionalRequests /></RequireIndividual></Route>
              <Route path="/company/interests" component={CompanyInterests} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function App() {
  if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppAuthProvider>
            <BoAuthProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                 <ClerkProvider
                   publishableKey={clerkPubKey}
                   proxyUrl={clerkProxyUrl}
                   appearance={{
                     theme: shadcn,
                     options: {
                       logoPlacement: "inside",
                       logoLinkUrl: basePath || "/",
                       logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
                     },
                     variables: {
                       colorPrimary: "#4f46e5",
                       colorForeground: "#111827",
                       colorMutedForeground: "#6b7280",
                       colorBackground: "#ffffff",
                       fontFamily: "Plus Jakarta Sans",
                       borderRadius: "0.75rem",
                     },
                   }}
                   signInUrl={`${basePath}/sign-in`}
                   signUpUrl={`${basePath}/sign-up`}
                   localization={{
                     signIn: { start: { title: "Welcome back", subtitle: "Sign in to access your account" } },
                     signUp: { start: { title: "Create your account", subtitle: "Get started today" } },
                   }}
                 >
                   <ClerkBridge />
                   <Router />
                 </ClerkProvider>
              </WouterRouter>
            </BoAuthProvider>
          </AppAuthProvider>
          <Toaster />
          <CookieConsent />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;

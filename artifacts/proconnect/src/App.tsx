import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import OfferPage from "@/pages/offer-page";
import { CookieConsent } from "@/components/cookie-consent";

const queryClient = new QueryClient();

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
      navigate(user.accountType === "company" ? "/company-dashboard" : "/feed");
    }
  }, [user, navigate]);

  if (user) return null;
  return <>{children}</>;
}

// ── Router ────────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
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

      {/* All main-app pages — require user session */}
      <Route>
        <RequireAuth>
          <Layout>
            <Switch>
              <Route path="/feed"><RequireIndividual><Feed /></RequireIndividual></Route>
              <Route path="/profiles" component={Profiles} />
              <Route path="/profiles/:id" component={ProfileDetail} />
              <Route path="/jobs" component={Jobs} />
              <Route path="/jobs/:id" component={JobDetail} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppAuthProvider>
          <BoAuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </BoAuthProvider>
        </AppAuthProvider>
        <Toaster />
        <CookieConsent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

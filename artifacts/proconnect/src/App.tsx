import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, type ReactNode } from "react";
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

const queryClient = new QueryClient();

// ── Auth guards ───────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;
  return <>{children}</>;
}

function RequireBoAuth({ children }: { children: ReactNode }) {
  const { session } = useBoAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!session) navigate("/bo");
  }, [session, navigate]);

  if (!session) return null;
  return <>{children}</>;
}

// ── Router ────────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/company-login" component={CompanyLogin} />
      <Route path="/signup" component={Signup} />

      {/* Backoffice login (public) */}
      <Route path="/bo" component={BoLogin} />

      {/* Backoffice dashboard — requires BO session */}
      <Route path="/bo/dashboard">
        <RequireBoAuth>
          <Admin />
        </RequireBoAuth>
      </Route>

      {/* All main-app pages — require user session */}
      <Route>
        <RequireAuth>
          <Layout>
            <Switch>
              <Route path="/feed" component={Feed} />
              <Route path="/company-dashboard" component={CompanyDashboard} />
              <Route path="/profiles" component={Profiles} />
              <Route path="/profiles/:id" component={ProfileDetail} />
              <Route path="/profile/edit" component={ProfileEdit} />
              <Route path="/jobs" component={Jobs} />
              <Route path="/jobs/:id" component={JobDetail} />
              <Route path="/applications" component={Applications} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/messaging" component={Messaging} />
              <Route path="/my-items" component={MyItems} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/salary-estimator" component={SalaryEstimator} />
              <Route path="/my-work" component={MyWork} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

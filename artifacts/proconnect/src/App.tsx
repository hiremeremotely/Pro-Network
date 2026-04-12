import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { BoAuthProvider } from "@/contexts/bo-auth";
import { AppAuthProvider } from "@/contexts/app-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public landing */}
      <Route path="/" component={Landing} />

      {/* Main app auth */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Backoffice */}
      <Route path="/bo" component={BoLogin} />
      <Route path="/bo/dashboard" component={Admin} />

      {/* All app pages use the LinkedIn-style Layout */}
      <Route>
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
            <Route component={NotFound} />
          </Switch>
        </Layout>
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

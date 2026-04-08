import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { BoAuthProvider } from "@/contexts/bo-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Feed from "@/pages/feed";
import Profiles from "@/pages/profiles";
import ProfileDetail from "@/pages/profile-detail";
import ProfileEdit from "@/pages/profile-edit";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Applications from "@/pages/applications";
import BoLogin from "@/pages/bo-login";
import Admin from "@/pages/admin";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public landing */}
      <Route path="/" component={Landing} />

      {/* Backoffice — login page */}
      <Route path="/bo" component={BoLogin} />

      {/* Backoffice — protected dashboard (auth guard is inside Admin) */}
      <Route path="/bo/dashboard" component={Admin} />

      {/* All app pages use the LinkedIn-style Layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/feed" component={Feed} />
            <Route path="/profiles" component={Profiles} />
            <Route path="/profiles/:id" component={ProfileDetail} />
            <Route path="/profile/edit" component={ProfileEdit} />
            <Route path="/jobs" component={Jobs} />
            <Route path="/jobs/:id" component={JobDetail} />
            <Route path="/applications" component={Applications} />
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
        <BoAuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </BoAuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

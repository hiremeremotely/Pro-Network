import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Feed from "@/pages/feed";
import Profiles from "@/pages/profiles";
import ProfileDetail from "@/pages/profile-detail";
import ProfileEdit from "@/pages/profile-edit";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Applications from "@/pages/applications";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Landing page has its own header/footer — no shared Layout */}
      <Route path="/" component={Landing} />

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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";

// Page imports
import Home from "@/pages/home";
import Tasks from "@/pages/tasks";
import Habits from "@/pages/habits";
import Finances from "@/pages/finances";
import PdfImport from "@/pages/pdf-import";
import Tags from "@/pages/tags";
import Badges from "@/pages/badges";
import Admin from "@/pages/admin";
import StudyPlanner from "@/pages/planner";
import Notes from "@/pages/notes";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/planner" component={StudyPlanner} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/habits" component={Habits} />
        <Route path="/finances" component={Finances} />
        <Route path="/pdf-import" component={PdfImport} />
        <Route path="/notes" component={Notes} />
        <Route path="/tags" component={Tags} />
        <Route path="/badges" component={Badges} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
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

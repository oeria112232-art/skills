import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeContext";
import { AuthProvider } from "@/components/layout/AuthContext";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import WorkshopsPage from "@/pages/workshops";
import WorkshopDetailPage from "@/pages/workshop-detail";
import CertificatesPage from "@/pages/certificates";
import CertificateViewPage from "@/pages/certificate-view";
import LearnPage from "@/pages/learn";
import TrackDetailPage from "@/pages/track-detail";
import LeaderboardPage from "@/pages/leaderboard";
import MockInterviewPage from "@/pages/mock-interview";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminJobsPage from "@/pages/admin/jobs";
import AdminApplicationsPage from "@/pages/admin/applications";
import AdminWorkshopsPage from "@/pages/admin/workshops";
import AdminUsersPage from "@/pages/admin/users";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:id" component={JobDetailPage} />
      <Route path="/workshops" component={WorkshopsPage} />
      <Route path="/workshops/:id" component={WorkshopDetailPage} />
      <Route path="/certificates" component={CertificatesPage} />
      <Route path="/certificate/:id" component={CertificateViewPage} />
      <Route path="/learn" component={LearnPage} />
      <Route path="/learn/:slug" component={TrackDetailPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/mock-interview" component={MockInterviewPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/jobs" component={AdminJobsPage} />
      <Route path="/admin/applications" component={AdminApplicationsPage} />
      <Route path="/admin/workshops" component={AdminWorkshopsPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="eduplat-theme">
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

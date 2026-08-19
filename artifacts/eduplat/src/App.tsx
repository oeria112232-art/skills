import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeContext";
import { LanguageProvider } from "@/components/layout/LanguageContext";
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
import ConsultationsPage from "@/pages/consultations";
import AdminConsultationsPage from "@/pages/admin/consultations";
import AdminDepositsPage from "@/pages/admin/deposits";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminJobsPage from "@/pages/admin/jobs";
import AdminApplicationsPage from "@/pages/admin/applications";
import AdminWorkshopsPage from "@/pages/admin/workshops";
import AdminInstructorsPage from "@/pages/admin/instructors";
import AdminCompaniesPage from "@/pages/admin/companies";
import CompanyDashboardPage from "@/pages/company/dashboard";
import CompanyJobsPage from "@/pages/company/jobs";
import CompanyApplicationsPage from "@/pages/company/applications";
import AdminExamsPage from "@/pages/admin/exams";
import AdminCertificatesPage from "@/pages/admin/certificates";
import AdminCertificatesLevelPage from "@/pages/admin/certificates-level";
import AdminPointsRulesPage from "@/pages/admin/points-rules";
import AdminTracksPage from "@/pages/admin/tracks";
import AdminTrackBuilderPage from "@/pages/admin/track-builder";
import UserSettingsPage from "@/pages/user/settings";
import CVBuilderPage from "@/pages/user/cv-builder";
import UserApplicationsPage from "@/pages/user/applications";
import UserWalletPage from "@/pages/user/wallet";
import AuthPage from "@/pages/auth";
import VerifyCertificatePage from "@/pages/verify-certificate";
import AdminStreamsPage from "@/pages/admin/streams";
import SecurityMonitorPage from "@/pages/admin/security-monitor";
import { MaintenanceGuard } from "@/components/layout/MaintenanceGuard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useAuth } from "@/components/layout/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function ProtectedRoute({ component: Component, path, ...rest }: any) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  if (!user) {
    return null;
  }

  return <Route {...rest} component={Component} />;
}

function RoleProtectedRoute({ component: Component, allowedPageId, ...rest }: any) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  if (!user) {
    return null;
  }

  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin";
  const isCompany = user.role === "company";

  if (!isAdmin && !isCompany && !isSuperAdmin) {
    return <Route component={NotFound} />;
  }

  return <Route {...rest} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-certificate" component={VerifyCertificatePage} />
        <ProtectedRoute path="/user/settings" component={UserSettingsPage} />
        <ProtectedRoute path="/user/cv-builder" component={CVBuilderPage} />
        <ProtectedRoute path="/user/applications" component={UserApplicationsPage} />
        <ProtectedRoute path="/user/wallet" component={UserWalletPage} />
      
      <ProtectedRoute path="/jobs" component={() => <MaintenanceGuard pageId="jobs" pageNameAr="سوق الوظائف"><JobsPage /></MaintenanceGuard>} />
      <ProtectedRoute path="/jobs/:id" component={() => <MaintenanceGuard pageId="jobs" pageNameAr="سوق الوظائف"><JobDetailPage /></MaintenanceGuard>} />
      <ProtectedRoute path="/workshops" component={() => <MaintenanceGuard pageId="workshops" pageNameAr="الورشات التدريبية"><WorkshopsPage /></MaintenanceGuard>} />
      <ProtectedRoute path="/workshops/:id" component={() => <MaintenanceGuard pageId="workshops" pageNameAr="الورشات التدريبية"><WorkshopDetailPage /></MaintenanceGuard>} />
      <ProtectedRoute path="/certificates" component={() => <MaintenanceGuard pageId="certificates" pageNameAr="نظام الشهادات"><CertificatesPage /></MaintenanceGuard>} />
      <ProtectedRoute path="/certificate/:id" component={CertificateViewPage} />
      <ProtectedRoute path="/learn" component={LearnPage} />
      <ProtectedRoute path="/learn/:slug" component={TrackDetailPage} />
      <ProtectedRoute path="/leaderboard" component={LeaderboardPage} />
      <ProtectedRoute path="/consultations" component={() => <MaintenanceGuard pageId="consultations" pageNameAr="قسم الاستشارات"><ConsultationsPage /></MaintenanceGuard>} />
      
      <RoleProtectedRoute path="/admin" component={AdminDashboard} allowedPageId="dashboard" />
      <RoleProtectedRoute path="/admin/security-monitor" component={SecurityMonitorPage} allowedPageId="dashboard" />
      <RoleProtectedRoute path="/admin/jobs" component={AdminJobsPage} allowedPageId="jobs" />
      <RoleProtectedRoute path="/admin/applications" component={AdminApplicationsPage} allowedPageId="applications" />
      <RoleProtectedRoute path="/admin/workshops" component={AdminWorkshopsPage} allowedPageId="workshops" />
      <RoleProtectedRoute path="/admin/tracks" component={AdminTracksPage} allowedPageId="tracks" />
      <RoleProtectedRoute path="/admin/tracks/:id" component={AdminTrackBuilderPage} allowedPageId="tracks" />
      <RoleProtectedRoute path="/admin/exams" component={AdminExamsPage} allowedPageId="exams" />
      <RoleProtectedRoute path="/admin/certificates" component={AdminCertificatesPage} allowedPageId="certificates" />
      <RoleProtectedRoute path="/admin/certificates/level/:levelNum" component={AdminCertificatesLevelPage} allowedPageId="certificates" />
      <RoleProtectedRoute path="/admin/instructors" component={AdminInstructorsPage} allowedPageId="users" />
      <RoleProtectedRoute path="/admin/companies" component={AdminCompaniesPage} allowedPageId="users" />
      <RoleProtectedRoute path="/admin/consultations" component={AdminConsultationsPage} allowedPageId="consultations" />
      <RoleProtectedRoute path="/admin/streams" component={AdminStreamsPage} allowedPageId="dashboard" />
      <RoleProtectedRoute path="/admin/deposits" component={AdminDepositsPage} allowedPageId="dashboard" />
      <RoleProtectedRoute path="/admin/subscriptions" component={AdminDepositsPage} allowedPageId="dashboard" />
      <RoleProtectedRoute path="/admin/points-rules" component={AdminPointsRulesPage} allowedPageId="dashboard" />
      <RoleProtectedRoute path="/company/dashboard" component={CompanyDashboardPage} allowedPageId="company" />
      <RoleProtectedRoute path="/company/jobs" component={CompanyJobsPage} allowedPageId="company" />
      <RoleProtectedRoute path="/company/applications" component={CompanyApplicationsPage} allowedPageId="company" />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="eduplat-theme">
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <ErrorBoundary>
                  <Router />
                </ErrorBoundary>
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;




import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CRMLayout } from "./components/crm/CRMLayout";
import { AffiliateLayout } from "./components/affiliate/AffiliateLayout";
import Dashboard from "./pages/Dashboard";
import Email from "./pages/Email";
import Contacts from "./pages/Contacts";
import Accounts from "./pages/Accounts";
import Leads from "./pages/Leads";
import LeadImport from "./pages/LeadImport";
import Deals from "./pages/Deals";
import Estimates from "./pages/Estimates";
import CreateEstimate from "./pages/CreateEstimate";
import Invoices from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import Tasks from "./pages/Tasks";
import MediaLibrary from "./pages/MediaLibrary";
import VoiceDemo from "./pages/VoiceDemo";
import Demos from "./pages/Demos";
import DemoDetail from "./pages/DemoDetail";
import PublicDemo from "./pages/PublicDemo";
import Calendar from "./pages/Calendar";
import Sales from "./pages/Sales";
import Checkout from "./pages/Checkout";
import BusinessOpportunity from "./pages/BusinessOpportunity";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import AffiliatePublicPage from "./pages/AffiliatePublicPage";
import AffiliateSignup from "./pages/AffiliateSignup";
import AffiliateSignupSuccess from "./pages/AffiliateSignupSuccess";

// Affiliate pages
import AffiliateDashboard from "./pages/affiliate/AffiliateDashboard";
import AffiliateLeads from "./pages/affiliate/AffiliateLeads";
import AffiliateDemos from "./pages/affiliate/AffiliateDemos";
import AffiliateCommissions from "./pages/affiliate/AffiliateCommissions";
import AffiliateTeam from "./pages/affiliate/AffiliateTeam";
import AffiliateTraining from "./pages/affiliate/AffiliateTraining";
import AffiliateSettings from "./pages/affiliate/AffiliateSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public pages - outside any layout */}
          <Route path="/demo/:id" element={<PublicDemo />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/biz" element={<BusinessOpportunity />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Affiliate replicated URL - public facing */}
          <Route path="/rep/:username" element={<AffiliatePublicPage />} />
          
          {/* Affiliate signup - public */}
          <Route path="/affiliate-signup" element={<AffiliateSignup />} />
          <Route path="/affiliate-signup/success" element={<AffiliateSignupSuccess />} />
          
          {/* Affiliate routes - inside AffiliateLayout */}
          <Route element={<AffiliateLayout />}>
            <Route path="/affiliate" element={<AffiliateDashboard />} />
            <Route path="/affiliate/leads" element={<AffiliateLeads />} />
            <Route path="/affiliate/demos" element={<AffiliateDemos />} />
            <Route path="/affiliate/demos/:id" element={<DemoDetail />} />
            <Route path="/affiliate/commissions" element={<AffiliateCommissions />} />
            <Route path="/affiliate/team" element={<AffiliateTeam />} />
            <Route path="/affiliate/training" element={<AffiliateTraining />} />
            <Route path="/affiliate/settings" element={<AffiliateSettings />} />
          </Route>
          
          {/* CRM routes - inside CRM layout (for admins/super_admins) */}
          <Route element={<CRMLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/email" element={<Email />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/import" element={<LeadImport />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/estimates/create" element={<CreateEstimate />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/create" element={<CreateInvoice />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/media-library" element={<MediaLibrary />} />
            <Route path="/voice-demo" element={<VoiceDemo />} />
            <Route path="/demos" element={<Demos />} />
            <Route path="/demos/:id" element={<DemoDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

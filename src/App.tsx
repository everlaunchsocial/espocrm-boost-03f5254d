// Force rebuild - clearing stale Vite cache v2
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SubdomainRouter } from "./components/SubdomainRouter";
import { ScrollToTop } from "./components/ScrollToTop";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { RoleRouteGuard } from "./components/RoleRouteGuard";
import { TestModeIndicator } from "./components/TestModeIndicator";
import { CRMLayout } from "./components/crm/CRMLayout";
import { AffiliateLayout } from "./components/affiliate/AffiliateLayout";
import { CustomerPortalLayout } from "./components/customer/CustomerPortalLayout";
import { CustomerOnboardingLayout } from "./components/customer/CustomerOnboardingLayout";
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
import Campaigns from "./pages/Campaigns";
import Competitors from "./pages/Competitors";
import EmailTemplates from "./pages/EmailTemplates";
import MediaLibrary from "./pages/MediaLibrary";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Integrations from "./pages/Integrations";
import AdminPanel from "./pages/AdminPanel";
import BillingDashboard from "./pages/BillingDashboard";
import PrivacyCenter from "./pages/PrivacyCenter";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import WhiteLabelDashboard from "./pages/WhiteLabelDashboard";
import VoiceDemo from "./pages/VoiceDemo";
import Demos from "./pages/Demos";
import DemoDetail from "./pages/DemoDetail";
import PublicDemo from "./pages/PublicDemo";
import ReferralRedirect from "./pages/ReferralRedirect";
import Calendar from "./pages/Calendar";
import Sales from "./pages/Sales";
import Checkout from "./pages/Checkout";
import BusinessOpportunity from "./pages/BusinessOpportunity";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import AffiliatePublicPage from "./pages/AffiliatePublicPage";
import AffiliateSignup from "./pages/AffiliateSignup";
import AffiliateSignupAccount from "./pages/AffiliateSignupAccount";
import AffiliateSignupSuccess from "./pages/AffiliateSignupSuccess";
import ResetPassword from "./pages/ResetPassword";
import Auth from "./pages/Auth";
import Product from "./pages/Product";
import CustomerBuy from "./pages/CustomerBuy";
import ProspectSearch from "./pages/ProspectSearch";
import VoiceNotes from "./pages/VoiceNotes";

// New customer pre-signup pages
import CustomerLandingPage from "./pages/customer/CustomerLandingPage";
import CustomerCheckoutPage from "./pages/customer/CustomerCheckoutPage";
import DemoRequestPage from "./pages/customer/DemoRequestPage";
import CustomerBuySuccess from "./pages/customer/CustomerBuySuccess";

// Affiliate pages
import AffiliateDashboard from "./pages/affiliate/AffiliateDashboard";
import AffiliateCustomers from "./pages/affiliate/AffiliateCustomers";
import AffiliateCustomerDetail from "./pages/affiliate/AffiliateCustomerDetail";
import AffiliateLeads from "./pages/affiliate/AffiliateLeads";
import AffiliateDemos from "./pages/affiliate/AffiliateDemos";
import AffiliateCommissions from "./pages/affiliate/AffiliateCommissions";
import AffiliateTeam from "./pages/affiliate/AffiliateTeam";
import AffiliateTraining from "./pages/affiliate/AffiliateTraining";
import VerticalTrainingLibrary from "./pages/affiliate/VerticalTrainingLibrary";
import AffiliateSalesTools from "./pages/affiliate/AffiliateSalesTools";
import AffiliateSettings from "./pages/affiliate/AffiliateSettings";
import AffiliateBilling from "./pages/affiliate/AffiliateBilling";
import AffiliateAbandonments from "./pages/affiliate/AffiliateAbandonments";
import AffiliateVideos from "./pages/affiliate/AffiliateVideos";
import CreateAvatarProfile from "./pages/affiliate/CreateAvatarProfile";
import CreateVideo from "./pages/affiliate/CreateVideo";
import AdminPayouts from "./pages/AdminPayouts";
import AdminCustomerUsage from "./pages/AdminCustomerUsage";
import CustomerUsage from "./pages/CustomerUsage";
import AdminAffiliateVideos from "./pages/admin/AdminAffiliateVideos";
import AdminCreateAvatarProfile from "./pages/admin/AdminCreateAvatarProfile";
import AdminCreateVideo from "./pages/admin/AdminCreateVideo";
import VideoLandingPage from "./pages/VideoLandingPage";
import Logout from "./pages/Logout";
 
// Admin pages
import AdminProfile from "./pages/admin/AdminProfile";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCompPlans from "./pages/admin/AdminCompPlans";
import AdminAffiliates from "./pages/admin/AdminAffiliates";
import AdminCustomers from "./pages/admin/AdminCustomers";
import SignupAnalytics from "./pages/admin/SignupAnalytics";
import AdminGenealogy from "./pages/admin/AdminGenealogy";
import AdminTraining from "./pages/admin/AdminTraining";
import AdminTrainingVideos from "./pages/admin/AdminTrainingVideos";
import TrainingLibrary from "./pages/admin/TrainingLibrary";
import VerticalTrainingList from "./pages/admin/VerticalTrainingList";
import TestAnalyzer from "./pages/admin/TestAnalyzer";
import QualityInsights from "./pages/admin/QualityInsights";
import UsageDashboard from "./pages/admin/UsageDashboard";
import Operations from "./pages/admin/Operations";
import UploadBackground from "./pages/admin/UploadBackground";
import RegressionTests from "./pages/admin/RegressionTests";
import AdminEvertrak from "./pages/admin/AdminEvertrak";
import SuggestionLog from "./pages/admin/SuggestionLog";
import AIAssistantAnalytics from "./pages/admin/AIAssistantAnalytics";
import Testing from "./pages/admin/Testing";


// Customer Portal pages
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerSettings from "./pages/customer/CustomerSettings";
import VoiceSettings from "./pages/customer/VoiceSettings";
import KnowledgeSettings from "./pages/customer/KnowledgeSettings";
import LeadCaptureSettings from "./pages/customer/LeadCaptureSettings";
import CalendarSettings from "./pages/customer/CalendarSettings";
import DeploySettings from "./pages/customer/DeploySettings";
import CustomerLeads from "./pages/customer/CustomerLeads";
import CustomerBilling from "./pages/customer/CustomerBilling";
import CustomerSupport from "./pages/customer/CustomerSupport";
import AIPreview from "./pages/customer/AIPreview";
import CustomerTraining from "./pages/customer/CustomerTraining";
import CustomerAffiliate from "./pages/customer/CustomerAffiliate";
import CustomerInsights from "./pages/customer/CustomerInsights";
import CustomerEvertrak from "./pages/customer/CustomerEvertrak";

// Customer Onboarding pages
import OnboardingStep1 from "./pages/customer/OnboardingStep1";
import OnboardingStep2 from "./pages/customer/OnboardingStep2";
import OnboardingStep3 from "./pages/customer/OnboardingStep3";
import OnboardingStep4 from "./pages/customer/OnboardingStep4";
import OnboardingStep5 from "./pages/customer/OnboardingStep5";
import OnboardingStep6 from "./pages/customer/OnboardingStep6";
import VerticalLandingPage from "./pages/verticals/VerticalLandingPage";
import TestModeEntry from "./pages/TestModeEntry";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <ImpersonationBanner />
        <RoleRouteGuard />
        <TestModeIndicator />
        <SubdomainRouter>
          <Routes>
          {/* Test mode entry - for automation tools */}
          <Route path="/test-mode-entry" element={<TestModeEntry />} />
          
          {/* Public pages - outside any layout */}
          <Route path="/voice-notes" element={<VoiceNotes />} />
          <Route path="/demo/:id" element={<PublicDemo />} />
          <Route path="/v/:slug" element={<VideoLandingPage />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/biz" element={<BusinessOpportunity />} />
          <Route path="/partner" element={<AffiliateSignup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/not-found" element={<NotFound />} />
          <Route path="/privacy" element={<PrivacyCenter />} />
          <Route path="/logout" element={<Logout />} />
          
          {/* Product & Customer purchase pages - public */}
          <Route path="/product" element={<Product />} />
          <Route path="/buy" element={<CustomerCheckoutPage />} />
          <Route path="/demo-request" element={<DemoRequestPage />} />
          <Route path="/customer/buy-success" element={<CustomerBuySuccess />} />
          
          {/* Affiliate replicated URL - public facing */}
          <Route path="/rep/:username" element={<AffiliatePublicPage />} />
          
          {/* Auth - public */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Affiliate signup - public */}
          <Route path="/affiliate-signup" element={<AffiliateSignup />} />
          <Route path="/affiliate-signup/account" element={<AffiliateSignupAccount />} />
          <Route path="/affiliate-signup/success" element={<AffiliateSignupSuccess />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Customer Onboarding Wizard - separate layout */}
          <Route path="/customer/onboarding/wizard/1" element={
            <CustomerOnboardingLayout currentStep={1}>
              <OnboardingStep1 />
            </CustomerOnboardingLayout>
          } />
          <Route path="/customer/onboarding/wizard/2" element={
            <CustomerOnboardingLayout currentStep={2}>
              <OnboardingStep2 />
            </CustomerOnboardingLayout>
          } />
          <Route path="/customer/onboarding/wizard/3" element={
            <CustomerOnboardingLayout currentStep={3}>
              <OnboardingStep3 />
            </CustomerOnboardingLayout>
          } />
          <Route path="/customer/onboarding/wizard/4" element={
            <CustomerOnboardingLayout currentStep={4}>
              <OnboardingStep4 />
            </CustomerOnboardingLayout>
          } />
          <Route path="/customer/onboarding/wizard/5" element={
            <CustomerOnboardingLayout currentStep={5}>
              <OnboardingStep5 />
            </CustomerOnboardingLayout>
          } />
          <Route path="/customer/onboarding/wizard/6" element={
            <CustomerOnboardingLayout currentStep={6}>
              <OnboardingStep6 />
            </CustomerOnboardingLayout>
          } />
          
          {/* Customer Portal routes - inside CustomerPortalLayout */}
          <Route element={<CustomerPortalLayout />}>
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/settings" element={<CustomerSettings />} />
            <Route path="/customer/settings/voice" element={<VoiceSettings />} />
            <Route path="/customer/settings/knowledge" element={<KnowledgeSettings />} />
            <Route path="/customer/settings/leads" element={<LeadCaptureSettings />} />
            <Route path="/customer/settings/calendar" element={<CalendarSettings />} />
            <Route path="/customer/settings/deploy" element={<DeploySettings />} />
            <Route path="/customer/leads" element={<CustomerLeads />} />
            <Route path="/customer/billing" element={<CustomerBilling />} />
            <Route path="/customer/support" element={<CustomerSupport />} />
            <Route path="/customer/preview" element={<AIPreview />} />
            <Route path="/customer/calendar" element={<Calendar />} />
            <Route path="/customer/training" element={<CustomerTraining />} />
            <Route path="/customer/insights" element={<CustomerInsights />} />
            <Route path="/customer/evertrak" element={<CustomerEvertrak />} />
            <Route path="/customer/affiliate" element={<CustomerAffiliate />} />
          </Route>
          
          {/* Affiliate routes - inside AffiliateLayout */}
          <Route element={<AffiliateLayout />}>
            <Route path="/affiliate" element={<AffiliateDashboard />} />
            <Route path="/affiliate/customers" element={<AffiliateCustomers />} />
            <Route path="/affiliate/customers/:id" element={<AffiliateCustomerDetail />} />
            <Route path="/affiliate/accounts" element={<Navigate to="/affiliate/customers" replace />} />
            <Route path="/affiliate/abandonments" element={<AffiliateAbandonments />} />
            <Route path="/affiliate/leads" element={<AffiliateLeads />} />
            <Route path="/affiliate/demos" element={<AffiliateDemos />} />
            <Route path="/affiliate/demos/:id" element={<DemoDetail />} />
            <Route path="/affiliate/commissions" element={<AffiliateCommissions />} />
            <Route path="/affiliate/team" element={<AffiliateTeam />} />
            <Route path="/affiliate/training" element={<AffiliateTraining />} />
            <Route path="/affiliate/training/verticals" element={<VerticalTrainingLibrary />} />
            <Route path="/affiliate/sales-tools" element={<AffiliateSalesTools />} />
            <Route path="/affiliate/videos" element={<AffiliateVideos />} />
            <Route path="/affiliate/create-profile" element={<CreateAvatarProfile />} />
            <Route path="/affiliate/create-video/:profileId" element={<CreateVideo />} />
            <Route path="/affiliate/billing" element={<AffiliateBilling />} />
            <Route path="/affiliate/settings" element={<AffiliateSettings />} />
          </Route>
          
          {/* Vertical Landing Pages - /:username/sales/:vertical */}
          <Route path="/:username/sales/:vertical" element={<VerticalLandingPage />} />
          
          {/* Referral links - check if username is valid affiliate, redirect to signup */}
          <Route path="/:username" element={<ReferralRedirect />} />
          
          {/* CRM routes - inside CRM layout (for admins/super_admins) */}
          <Route element={<CRMLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/comp-plans" element={<AdminCompPlans />} />
            <Route path="/admin/affiliates" element={<AdminAffiliates />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/genealogy" element={<AdminGenealogy />} />
            <Route path="/admin/payouts" element={<AdminPayouts />} />
            <Route path="/admin/customer-usage" element={<AdminCustomerUsage />} />
            <Route path="/admin/signup-analytics" element={<SignupAnalytics />} />
<Route path="/admin/training" element={<AdminTraining />} />
            <Route path="/admin/training-library" element={<TrainingLibrary />} />
            <Route path="/admin/verticals" element={<VerticalTrainingList />} />
            <Route path="/admin/affiliate-training/verticals" element={<VerticalTrainingLibrary />} />
            <Route path="/admin/training-videos" element={<AdminTrainingVideos />} />
            <Route path="/admin/test-analyzer" element={<TestAnalyzer />} />
            <Route path="/admin/quality-insights" element={<QualityInsights />} />
            <Route path="/admin/regression-tests" element={<RegressionTests />} />
            <Route path="/admin/evertrak" element={<AdminEvertrak />} />
            <Route path="/admin/usage" element={<UsageDashboard />} />
            <Route path="/admin/operations" element={<Operations />} />
            <Route path="/admin/suggestion-log" element={<SuggestionLog />} />
            <Route path="/admin/ai-analytics" element={<AIAssistantAnalytics />} />
            <Route path="/admin/testing" element={<Testing />} />
            <Route path="/admin/upload-background" element={<UploadBackground />} />
            <Route path="/admin/affiliate-videos" element={<AdminAffiliateVideos />} />
            <Route path="/admin/affiliate-videos/create-profile" element={<AdminCreateAvatarProfile />} />
            <Route path="/admin/affiliate-videos/create-video" element={<AdminCreateVideo />} />
            <Route path="/customer/usage" element={<CustomerUsage />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/email" element={<Email />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/import" element={<LeadImport />} />
            <Route path="/prospect-search" element={<ProspectSearch />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/estimates/create" element={<CreateEstimate />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/create" element={<CreateInvoice />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/email-templates" element={<EmailTemplates />} />
            <Route path="/media-library" element={<MediaLibrary />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/billing" element={<BillingDashboard />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/admin/compliance" element={<ComplianceDashboard />} />
            <Route path="/admin/white-label" element={<WhiteLabelDashboard />} />
            <Route path="/voice-demo" element={<VoiceDemo />} />
            <Route path="/demos" element={<Demos />} />
            <Route path="/demos/:id" element={<DemoDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          </Routes>
        </SubdomainRouter>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

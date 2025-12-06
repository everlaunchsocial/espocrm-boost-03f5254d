import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CRMLayout } from "./components/crm/CRMLayout";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public demo page - outside CRM layout */}
          <Route path="/demo/:id" element={<PublicDemo />} />
          
          {/* CRM routes - inside CRM layout */}
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

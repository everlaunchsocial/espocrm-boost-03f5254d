import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CRMLayout } from "@/components/crm/CRMLayout";
import Dashboard from "./pages/Dashboard";
import Email from "./pages/Email";
import Contacts from "./pages/Contacts";
import Accounts from "./pages/Accounts";
import Leads from "./pages/Leads";
import LeadImport from "./pages/LeadImport";
import Deals from "./pages/Deals";
import Tasks from "./pages/Tasks";
import MediaLibrary from "./pages/MediaLibrary";
import Estimates from "./pages/Estimates";
import CreateEstimate from "./pages/CreateEstimate";
import Invoices from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CRMLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/email" element={<Email />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/import" element={<LeadImport />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/media-library" element={<MediaLibrary />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/estimates/new" element={<CreateEstimate />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<CreateInvoice />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CRMLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

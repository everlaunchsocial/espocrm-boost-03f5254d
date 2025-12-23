-- Create documents table for contracts, proposals, etc.
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'custom',
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  file_size_bytes INTEGER,
  related_to_id UUID,
  related_to_type TEXT,
  related_to_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  uploaded_by UUID REFERENCES public.profiles(id),
  sent_to_email TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_request_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'custom',
  content_template TEXT NOT NULL,
  merge_fields JSONB NOT NULL DEFAULT '{}',
  is_global BOOLEAN NOT NULL DEFAULT false,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_signatures table
CREATE TABLE public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signature_data TEXT,
  ip_address TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "documents_authenticated_select" ON public.documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "documents_authenticated_insert" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "documents_authenticated_update" ON public.documents
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "documents_authenticated_delete" ON public.documents
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Document templates policies
CREATE POLICY "document_templates_select" ON public.document_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "document_templates_admin_insert" ON public.document_templates
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "document_templates_admin_update" ON public.document_templates
  FOR UPDATE USING (is_admin());

CREATE POLICY "document_templates_admin_delete" ON public.document_templates
  FOR DELETE USING (is_admin());

-- Document signatures policies
CREATE POLICY "document_signatures_select" ON public.document_signatures
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "document_signatures_insert" ON public.document_signatures
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_documents_related ON public.documents(related_to_id, related_to_type);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_document_templates_type ON public.document_templates(template_type);
CREATE INDEX idx_document_signatures_document ON public.document_signatures(document_id);

-- Insert pre-built templates
INSERT INTO public.document_templates (name, description, template_type, content_template, merge_fields, is_global, requires_signature) VALUES
('Standard Service Agreement', 'Standard contract for AI receptionist services', 'contract', 
'SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of {{start_date}} between:

Provider: Phone AI Solutions
Client: {{company}}
Contact: {{first_name}} {{last_name}}

SERVICES
The Provider agrees to provide the following services:
- AI Receptionist Service: {{service_plan}}
- Monthly Fee: ${{monthly_fee}}

TERM
This Agreement shall commence on {{start_date}} and continue on a month-to-month basis.

PAYMENT TERMS
Client agrees to pay the monthly fee of ${{monthly_fee}} on the first of each month.

SIGNATURES
By signing below, both parties agree to the terms of this Agreement.

_________________________
Client Signature

_________________________
Date', 
'{"company": "{{company}}", "first_name": "{{first_name}}", "last_name": "{{last_name}}", "service_plan": "{{service_plan}}", "monthly_fee": "{{monthly_fee}}", "start_date": "{{start_date}}"}',
true, true),

('Project Proposal', 'Detailed proposal for prospective clients', 'proposal',
'PROPOSAL

Prepared for: {{company}}
Contact: {{first_name}} {{last_name}}
Date: {{proposal_date}}

EXECUTIVE SUMMARY
We understand that {{company}} in the {{industry}} industry faces challenges with {{pain_points}}.

PROPOSED SOLUTION
{{solution}}

PRICING
{{pricing}}

TIMELINE
{{timeline}}

NEXT STEPS
1. Review this proposal
2. Schedule a demo call
3. Sign service agreement
4. Begin implementation

We look forward to partnering with {{company}}!',
'{"company": "{{company}}", "first_name": "{{first_name}}", "last_name": "{{last_name}}", "industry": "{{industry}}", "pain_points": "{{pain_points}}", "solution": "{{solution}}", "pricing": "{{pricing}}", "timeline": "{{timeline}}", "proposal_date": "{{proposal_date}}"}',
true, false),

('Mutual NDA', 'Non-disclosure agreement for confidential discussions', 'nda',
'MUTUAL NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}}.

PARTIES
Party A: Phone AI Solutions
Party B: {{company}}
Contact: {{contact_name}}

CONFIDENTIAL INFORMATION
Both parties agree to keep confidential any proprietary information shared during business discussions.

TERM
This Agreement shall remain in effect for two (2) years from the effective date.

SIGNATURES

_________________________
Party A Signature

_________________________
Party B Signature ({{contact_name}})',
'{"company": "{{company}}", "contact_name": "{{contact_name}}", "effective_date": "{{effective_date}}"}',
true, true),

('Quote/Estimate', 'Price quote for services', 'quote',
'QUOTE

Quote #: {{quote_number}}
Date: {{quote_date}}
Valid Until: {{valid_until}}

TO:
{{company}}
{{first_name}} {{last_name}}

SERVICES
{{services}}

SUBTOTAL: ${{subtotal}}
TAX: ${{tax}}
TOTAL: ${{total}}

TERMS
- Quote valid for 30 days
- Payment due upon signing
- 50% deposit required to begin

To accept this quote, please sign below or contact us.

_________________________
Client Signature',
'{"quote_number": "{{quote_number}}", "quote_date": "{{quote_date}}", "valid_until": "{{valid_until}}", "company": "{{company}}", "first_name": "{{first_name}}", "last_name": "{{last_name}}", "services": "{{services}}", "subtotal": "{{subtotal}}", "tax": "{{tax}}", "total": "{{total}}"}',
true, false),

('Invoice', 'Standard invoice for billing', 'invoice',
'INVOICE

Invoice #: {{invoice_number}}
Date: {{invoice_date}}
Due Date: {{due_date}}

BILL TO:
{{company}}
{{first_name}} {{last_name}}

ITEMS
{{items}}

TOTAL DUE: ${{total}}

PAYMENT METHODS
- Bank Transfer
- Credit Card
- Check

Thank you for your business!',
'{"invoice_number": "{{invoice_number}}", "invoice_date": "{{invoice_date}}", "due_date": "{{due_date}}", "company": "{{company}}", "first_name": "{{first_name}}", "last_name": "{{last_name}}", "items": "{{items}}", "total": "{{total}}"}',
true, false);
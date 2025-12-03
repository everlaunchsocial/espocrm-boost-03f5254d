-- Create sender_addresses table for storing verified sender emails
CREATE TABLE public.sender_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emails table for tracking sent emails
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  sender_name TEXT,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_id UUID NOT NULL DEFAULT gen_random_uuid(),
  opened_at TIMESTAMP WITH TIME ZONE,
  open_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.sender_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this CRM doesn't have auth yet)
CREATE POLICY "Allow public read on sender_addresses" ON public.sender_addresses FOR SELECT USING (true);
CREATE POLICY "Allow public insert on sender_addresses" ON public.sender_addresses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on sender_addresses" ON public.sender_addresses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on sender_addresses" ON public.sender_addresses FOR DELETE USING (true);

CREATE POLICY "Allow public read on emails" ON public.emails FOR SELECT USING (true);
CREATE POLICY "Allow public insert on emails" ON public.emails FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on emails" ON public.emails FOR UPDATE USING (true);

-- Create index for tracking pixel lookups
CREATE INDEX idx_emails_tracking_id ON public.emails(tracking_id);
CREATE INDEX idx_emails_contact_id ON public.emails(contact_id);

-- Insert a default sender address (user can update this)
INSERT INTO public.sender_addresses (email, name, is_default) 
VALUES ('onboarding@resend.dev', 'CRM System', true);
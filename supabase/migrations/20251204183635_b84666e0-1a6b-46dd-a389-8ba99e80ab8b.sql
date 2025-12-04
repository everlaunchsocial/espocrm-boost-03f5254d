-- Add discount columns to invoice_items table
ALTER TABLE public.invoice_items 
ADD COLUMN discount_type text DEFAULT 'fixed',
ADD COLUMN discount_amount numeric DEFAULT 0;
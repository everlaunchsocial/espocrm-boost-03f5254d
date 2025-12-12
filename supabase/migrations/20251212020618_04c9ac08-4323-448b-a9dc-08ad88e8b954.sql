-- Make vapi_account_id nullable to allow provisioning without a vapi_accounts record
ALTER TABLE public.customer_phone_numbers 
ALTER COLUMN vapi_account_id DROP NOT NULL;
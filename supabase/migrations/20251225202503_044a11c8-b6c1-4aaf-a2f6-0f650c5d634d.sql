-- Add columns to affiliates table for hybrid model
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS is_company_account BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS exclude_from_leaderboards BOOLEAN DEFAULT false;

-- Add customer_source to customer_profiles
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS customer_source TEXT DEFAULT 'direct';

-- Mark the everlaunch account as company account
UPDATE affiliates 
SET 
  is_company_account = true,
  exclude_from_leaderboards = true
WHERE username = 'everlaunch';
-- Ensure RLS is enabled on voice_settings
ALTER TABLE voice_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "customers_insert_own_voice_settings" ON voice_settings;
DROP POLICY IF EXISTS "customers_update_own_voice_settings" ON voice_settings;
DROP POLICY IF EXISTS "customers_select_own_voice_settings" ON voice_settings;
DROP POLICY IF EXISTS "voice_settings_customer_insert" ON voice_settings;
DROP POLICY IF EXISTS "voice_settings_customer_update" ON voice_settings;
DROP POLICY IF EXISTS "voice_settings_customer_select" ON voice_settings;

-- Allow customers to insert their own voice settings
CREATE POLICY "customers_insert_own_voice_settings" 
ON voice_settings FOR INSERT 
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  )
);

-- Allow customers to update their own voice settings
CREATE POLICY "customers_update_own_voice_settings" 
ON voice_settings FOR UPDATE 
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  )
);

-- Allow customers to select their own voice settings
CREATE POLICY "customers_select_own_voice_settings" 
ON voice_settings FOR SELECT 
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  )
);
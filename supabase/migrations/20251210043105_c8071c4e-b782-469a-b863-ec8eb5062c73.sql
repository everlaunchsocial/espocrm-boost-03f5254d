-- Add INSERT policy for voice_settings
CREATE POLICY "voice_settings_customer_insert" 
ON public.voice_settings 
FOR INSERT 
TO authenticated 
WITH CHECK (
  customer_id IN (
    SELECT id FROM customer_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Add UPDATE policy for voice_settings if missing
DROP POLICY IF EXISTS "voice_settings_customer_update" ON public.voice_settings;
CREATE POLICY "voice_settings_customer_update" 
ON public.voice_settings 
FOR UPDATE 
TO authenticated 
USING (
  customer_id IN (
    SELECT id FROM customer_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  customer_id IN (
    SELECT id FROM customer_profiles 
    WHERE user_id = auth.uid()
  )
);
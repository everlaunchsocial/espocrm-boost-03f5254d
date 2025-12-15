-- Create function to increment demo voice count atomically
CREATE OR REPLACE FUNCTION increment_demo_voice_count(demo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE demos 
  SET voice_interaction_count = voice_interaction_count + 1,
      status = 'engaged',
      updated_at = now()
  WHERE id = demo_id;
END;
$$;
-- Define pipeline status order for comparison
CREATE OR REPLACE FUNCTION public.get_pipeline_status_order(p_status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'new_lead' THEN 1
    WHEN 'contact_attempted' THEN 2
    WHEN 'demo_created' THEN 3
    WHEN 'demo_sent' THEN 4
    WHEN 'demo_engaged' THEN 5
    WHEN 'ready_to_buy' THEN 6
    WHEN 'customer_won' THEN 7
    WHEN 'lost_closed' THEN 8
    ELSE 0
  END;
$$;

-- Function to auto-advance lead to demo_engaged on engagement
CREATE OR REPLACE FUNCTION public.auto_advance_lead_on_demo_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_current_status text;
  v_demo_engaged_order int := 5;
  v_demo_sent_order int := 4;
  v_email_sent_at timestamptz;
  v_has_engagement boolean := false;
BEGIN
  -- Get lead_id from the demo
  IF TG_TABLE_NAME = 'demo_views' THEN
    SELECT d.lead_id, d.email_sent_at
    INTO v_lead_id, v_email_sent_at
    FROM demos d
    WHERE d.id = NEW.demo_id;
  ELSE
    -- Triggered from demos table
    v_lead_id := NEW.lead_id;
    v_email_sent_at := NEW.email_sent_at;
    
    -- Check if engagement happened
    v_has_engagement := (
      NEW.view_count > 0 OR 
      NEW.chat_interaction_count > 0 OR 
      NEW.voice_interaction_count > 0 OR
      (NEW.last_viewed_at IS NOT NULL AND NEW.email_sent_at IS NOT NULL AND NEW.last_viewed_at > NEW.email_sent_at)
    );
    
    -- If no engagement detected, exit early
    IF NOT v_has_engagement THEN
      RETURN NEW;
    END IF;
  END IF;

  -- No lead associated, exit
  IF v_lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current lead status
  SELECT pipeline_status INTO v_current_status
  FROM leads
  WHERE id = v_lead_id;

  IF v_current_status IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only advance if current status is before demo_engaged (order < 5)
  -- and at least at demo_sent (order >= 4)
  IF get_pipeline_status_order(v_current_status) >= v_demo_sent_order 
     AND get_pipeline_status_order(v_current_status) < v_demo_engaged_order THEN
    
    -- Update lead pipeline status
    UPDATE leads
    SET pipeline_status = 'demo_engaged',
        updated_at = now()
    WHERE id = v_lead_id;

    -- Log activity
    INSERT INTO activities (
      type,
      subject,
      description,
      related_to_type,
      related_to_id,
      is_system_generated
    ) VALUES (
      'status-change',
      'Lead engaged with demo',
      'Pipeline advanced to demo_engaged',
      'lead',
      v_lead_id,
      true
    );

    RAISE NOTICE 'Auto-advanced lead % to demo_engaged', v_lead_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on demo_views insert
DROP TRIGGER IF EXISTS trigger_demo_views_engagement ON demo_views;
CREATE TRIGGER trigger_demo_views_engagement
  AFTER INSERT ON demo_views
  FOR EACH ROW
  EXECUTE FUNCTION auto_advance_lead_on_demo_engagement();

-- Trigger on demos update (for interaction counts)
DROP TRIGGER IF EXISTS trigger_demos_engagement ON demos;
CREATE TRIGGER trigger_demos_engagement
  AFTER UPDATE OF view_count, chat_interaction_count, voice_interaction_count, last_viewed_at ON demos
  FOR EACH ROW
  WHEN (
    NEW.view_count > OLD.view_count OR
    NEW.chat_interaction_count > OLD.chat_interaction_count OR
    NEW.voice_interaction_count > OLD.voice_interaction_count OR
    (NEW.last_viewed_at IS DISTINCT FROM OLD.last_viewed_at AND NEW.last_viewed_at IS NOT NULL)
  )
  EXECUTE FUNCTION auto_advance_lead_on_demo_engagement();
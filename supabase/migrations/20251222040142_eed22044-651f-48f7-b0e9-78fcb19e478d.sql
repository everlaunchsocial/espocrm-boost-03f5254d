-- Create table for AI assistant sessions
CREATE TABLE public.ai_assistant_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  actions_count INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  user_role TEXT,
  page_route TEXT,
  voice_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI assistant actions
CREATE TABLE public.ai_assistant_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_assistant_sessions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_time_ms INTEGER,
  user_transcript TEXT,
  ai_response TEXT
);

-- Create indexes for analytics queries
CREATE INDEX idx_ai_assistant_sessions_user_id ON public.ai_assistant_sessions(user_id);
CREATE INDEX idx_ai_assistant_sessions_started_at ON public.ai_assistant_sessions(started_at);
CREATE INDEX idx_ai_assistant_actions_session_id ON public.ai_assistant_actions(session_id);
CREATE INDEX idx_ai_assistant_actions_action_type ON public.ai_assistant_actions(action_type);
CREATE INDEX idx_ai_assistant_actions_executed_at ON public.ai_assistant_actions(executed_at);

-- Enable RLS
ALTER TABLE public.ai_assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistant_actions ENABLE ROW LEVEL SECURITY;

-- Users can insert/view their own sessions
CREATE POLICY "Users can insert own sessions"
  ON public.ai_assistant_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.ai_assistant_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own sessions"
  ON public.ai_assistant_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON public.ai_assistant_sessions
  FOR SELECT
  USING (is_admin());

-- Users can insert actions for their sessions
CREATE POLICY "Users can insert actions for own sessions"
  ON public.ai_assistant_actions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_assistant_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

-- Users can view actions for their sessions
CREATE POLICY "Users can view own session actions"
  ON public.ai_assistant_actions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_assistant_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

-- Admins can view all actions
CREATE POLICY "Admins can view all actions"
  ON public.ai_assistant_actions
  FOR SELECT
  USING (is_admin());
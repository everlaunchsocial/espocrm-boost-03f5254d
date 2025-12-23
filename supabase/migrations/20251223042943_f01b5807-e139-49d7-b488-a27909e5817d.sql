-- Add missing columns to lead_team_notes
ALTER TABLE public.lead_team_notes 
ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'team',
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create mentions table
CREATE TABLE IF NOT EXISTS public.lead_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.lead_team_notes(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id UUID REFERENCES auth.users(id) NOT NULL,
  mentioned_by UUID REFERENCES auth.users(id) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_watchers table
CREATE TABLE IF NOT EXISTS public.lead_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  notification_preference TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, user_id)
);

-- Create team_messages table for internal chat
CREATE TABLE IF NOT EXISTS public.lead_team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  message_content TEXT NOT NULL,
  sent_by UUID REFERENCES auth.users(id) NOT NULL,
  reply_to_message_id UUID REFERENCES public.lead_team_messages(id),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_team_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_mentions
CREATE POLICY "Users can view mentions" ON public.lead_mentions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create mentions" ON public.lead_mentions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = mentioned_by);

CREATE POLICY "Users can update own mentions" ON public.lead_mentions
  FOR UPDATE USING (auth.uid() = mentioned_user_id);

-- RLS Policies for lead_watchers
CREATE POLICY "Users can view watchers" ON public.lead_watchers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage own watch status" ON public.lead_watchers
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for lead_team_messages
CREATE POLICY "Authenticated users can view messages" ON public.lead_team_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can send messages" ON public.lead_team_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = sent_by);

CREATE POLICY "Users can update own messages" ON public.lead_team_messages
  FOR UPDATE USING (auth.uid() = sent_by);

CREATE POLICY "Users can delete own messages" ON public.lead_team_messages
  FOR DELETE USING (auth.uid() = sent_by);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_mentions_mentioned_user ON public.lead_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_mentions_is_read ON public.lead_mentions(is_read);
CREATE INDEX IF NOT EXISTS idx_lead_watchers_lead_id ON public.lead_watchers(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_watchers_user_id ON public.lead_watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_team_messages_lead_id ON public.lead_team_messages(lead_id);

-- Enable realtime for team messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_team_messages;
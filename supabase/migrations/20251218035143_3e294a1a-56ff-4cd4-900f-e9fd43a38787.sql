-- ============================================
-- FEATURE DEVELOPMENT BACKLOG SYSTEM
-- Enterprise-grade Kanban for super_admin
-- ============================================

-- 1. ENUMS
CREATE TYPE public.backlog_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.backlog_action AS ENUM ('create', 'update', 'delete', 'comment', 'attach', 'move', 'assign', 'tag', 'link_chat', 'archive', 'restore');

-- 2. BACKLOG STATUSES TABLE (columns in Kanban)
CREATE TABLE public.backlog_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'circle',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_done_state BOOLEAN DEFAULT false,
  is_archived_state BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BACKLOG TAGS TABLE
CREATE TABLE public.backlog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#8b5cf6',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. MAIN BACKLOG ITEMS TABLE
CREATE TABLE public.backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status_id UUID NOT NULL REFERENCES public.backlog_statuses(id) ON DELETE RESTRICT,
  priority backlog_priority NOT NULL DEFAULT 'medium',
  position INTEGER NOT NULL DEFAULT 0,
  
  -- Estimation and tracking
  story_points INTEGER,
  estimated_hours NUMERIC(6,2),
  actual_hours NUMERIC(6,2),
  
  -- Abandonment
  is_abandoned BOOLEAN DEFAULT false,
  abandoned_at TIMESTAMPTZ,
  abandoned_reason TEXT,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  -- Conversation context from AI chats
  conversation_context TEXT,
  
  -- Metadata (extensible JSON field)
  metadata JSONB DEFAULT '{}',
  
  -- Full-text search vector
  search_vector TSVECTOR,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. BACKLOG ITEM TAGS (junction table)
CREATE TABLE public.backlog_item_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.backlog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, tag_id)
);

-- 6. BACKLOG COMMENTS
CREATE TABLE public.backlog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_resolution BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.backlog_comments(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 7. BACKLOG HISTORY (audit trail)
CREATE TABLE public.backlog_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  action backlog_action NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  changed_fields JSONB DEFAULT '{}',
  before_values JSONB DEFAULT '{}',
  after_values JSONB DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. BACKLOG ATTACHMENTS
CREATE TABLE public.backlog_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 9. BACKLOG ASSIGNEES
CREATE TABLE public.backlog_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, user_id)
);

-- 10. BACKLOG CHAT LINKS (links to AI chat sessions)
CREATE TABLE public.backlog_chat_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  chat_session_id TEXT,
  chat_platform TEXT DEFAULT 'lovable',
  chat_snapshot JSONB DEFAULT '[]',
  summary TEXT,
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Full-text search index
CREATE INDEX idx_backlog_items_search ON public.backlog_items USING GIN(search_vector);

-- Performance indexes
CREATE INDEX idx_backlog_items_status ON public.backlog_items(status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_backlog_items_priority ON public.backlog_items(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_backlog_items_position ON public.backlog_items(status_id, position) WHERE deleted_at IS NULL;
CREATE INDEX idx_backlog_items_abandoned ON public.backlog_items(is_abandoned) WHERE deleted_at IS NULL;
CREATE INDEX idx_backlog_comments_item ON public.backlog_comments(item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_backlog_history_item ON public.backlog_history(item_id);
CREATE INDEX idx_backlog_history_created ON public.backlog_history(created_at DESC);
CREATE INDEX idx_backlog_attachments_item ON public.backlog_attachments(item_id) WHERE deleted_at IS NULL;

-- ============================================
-- FULL-TEXT SEARCH TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.backlog_items_search_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.conversation_context, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER backlog_items_search_update
BEFORE INSERT OR UPDATE OF title, description, conversation_context
ON public.backlog_items
FOR EACH ROW
EXECUTE FUNCTION public.backlog_items_search_trigger();

-- ============================================
-- AUDIT HISTORY TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.backlog_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_email TEXT;
  v_action backlog_action;
  v_changed_fields JSONB := '{}';
  v_before_values JSONB := '{}';
  v_after_values JSONB := '{}';
BEGIN
  -- Get current user
  v_actor_id := auth.uid();
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_after_values := to_jsonb(NEW);
    
    INSERT INTO public.backlog_history (item_id, action, actor_id, actor_email, after_values)
    VALUES (NEW.id, v_action, v_actor_id, v_actor_email, v_after_values);
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine action type
    IF OLD.status_id != NEW.status_id THEN
      v_action := 'move';
    ELSIF OLD.is_abandoned != NEW.is_abandoned THEN
      v_action := CASE WHEN NEW.is_abandoned THEN 'archive' ELSE 'restore' END;
    ELSE
      v_action := 'update';
    END IF;
    
    -- Track changed fields
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      v_changed_fields := v_changed_fields || '{"title": true}'::jsonb;
      v_before_values := v_before_values || jsonb_build_object('title', OLD.title);
      v_after_values := v_after_values || jsonb_build_object('title', NEW.title);
    END IF;
    
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      v_changed_fields := v_changed_fields || '{"description": true}'::jsonb;
      v_before_values := v_before_values || jsonb_build_object('description', OLD.description);
      v_after_values := v_after_values || jsonb_build_object('description', NEW.description);
    END IF;
    
    IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
      v_changed_fields := v_changed_fields || '{"status_id": true}'::jsonb;
      v_before_values := v_before_values || jsonb_build_object('status_id', OLD.status_id);
      v_after_values := v_after_values || jsonb_build_object('status_id', NEW.status_id);
    END IF;
    
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      v_changed_fields := v_changed_fields || '{"priority": true}'::jsonb;
      v_before_values := v_before_values || jsonb_build_object('priority', OLD.priority);
      v_after_values := v_after_values || jsonb_build_object('priority', NEW.priority);
    END IF;
    
    IF OLD.is_abandoned IS DISTINCT FROM NEW.is_abandoned THEN
      v_changed_fields := v_changed_fields || '{"is_abandoned": true}'::jsonb;
      v_before_values := v_before_values || jsonb_build_object('is_abandoned', OLD.is_abandoned);
      v_after_values := v_after_values || jsonb_build_object('is_abandoned', NEW.is_abandoned);
    END IF;
    
    INSERT INTO public.backlog_history (item_id, action, actor_id, actor_email, changed_fields, before_values, after_values, reason)
    VALUES (NEW.id, v_action, v_actor_id, v_actor_email, v_changed_fields, v_before_values, v_after_values, NEW.abandoned_reason);
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_before_values := to_jsonb(OLD);
    
    INSERT INTO public.backlog_history (item_id, action, actor_id, actor_email, before_values)
    VALUES (OLD.id, v_action, v_actor_id, v_actor_email, v_before_values);
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER backlog_items_audit
AFTER INSERT OR UPDATE OR DELETE ON public.backlog_items
FOR EACH ROW
EXECUTE FUNCTION public.backlog_audit_trigger();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER backlog_items_updated_at
BEFORE UPDATE ON public.backlog_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER backlog_statuses_updated_at
BEFORE UPDATE ON public.backlog_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER backlog_comments_updated_at
BEFORE UPDATE ON public.backlog_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.backlog_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_chat_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Super Admin Only)
-- ============================================

-- Statuses: super_admin full access
CREATE POLICY "backlog_statuses_super_admin_all" ON public.backlog_statuses
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Tags: super_admin full access
CREATE POLICY "backlog_tags_super_admin_all" ON public.backlog_tags
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Items: super_admin full access
CREATE POLICY "backlog_items_super_admin_all" ON public.backlog_items
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Item Tags: super_admin full access
CREATE POLICY "backlog_item_tags_super_admin_all" ON public.backlog_item_tags
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Comments: super_admin full access
CREATE POLICY "backlog_comments_super_admin_all" ON public.backlog_comments
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- History: super_admin read only (append-only audit trail)
CREATE POLICY "backlog_history_super_admin_select" ON public.backlog_history
FOR SELECT USING (is_super_admin());

-- Attachments: super_admin full access
CREATE POLICY "backlog_attachments_super_admin_all" ON public.backlog_attachments
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Assignees: super_admin full access
CREATE POLICY "backlog_assignees_super_admin_all" ON public.backlog_assignees
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Chat Links: super_admin full access
CREATE POLICY "backlog_chat_links_super_admin_all" ON public.backlog_chat_links
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============================================
-- SEED DEFAULT STATUSES
-- ============================================

INSERT INTO public.backlog_statuses (name, slug, description, color, icon, position, is_default, is_done_state, is_archived_state) VALUES
('Idea', 'idea', 'Initial ideas and concepts to explore', '#8b5cf6', 'lightbulb', 0, true, false, false),
('Planning', 'planning', 'Features being planned and scoped', '#3b82f6', 'clipboard-list', 1, false, false, false),
('Executing', 'executing', 'Features currently in development', '#f59e0b', 'code', 2, false, false, false),
('Testing', 'testing', 'Features being tested and validated', '#10b981', 'test-tube', 3, false, false, false),
('Finished', 'finished', 'Completed and deployed features', '#22c55e', 'check-circle', 4, false, true, false),
('Archived', 'archived', 'Archived or deprioritized items', '#6b7280', 'archive', 5, false, false, true);

-- ============================================
-- SEED DEFAULT TAGS
-- ============================================

INSERT INTO public.backlog_tags (name, color, description) VALUES
('Enhancement', '#3b82f6', 'Improvements to existing features'),
('Bug', '#ef4444', 'Bug fixes and error corrections'),
('New Feature', '#22c55e', 'Brand new functionality'),
('Infrastructure', '#8b5cf6', 'Backend, database, or architecture work'),
('UI/UX', '#f59e0b', 'User interface and experience improvements'),
('Integration', '#06b6d4', 'Third-party integrations'),
('Performance', '#ec4899', 'Speed and optimization improvements'),
('Security', '#dc2626', 'Security-related work'),
('Documentation', '#64748b', 'Documentation updates');
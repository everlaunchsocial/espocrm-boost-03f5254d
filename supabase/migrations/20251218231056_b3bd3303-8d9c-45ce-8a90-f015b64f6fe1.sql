-- Create workspace_documents table for document library
CREATE TABLE public.workspace_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  search_vector TSVECTOR,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for super_admin access
CREATE POLICY "workspace_documents_super_admin_all"
  ON public.workspace_documents
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create search trigger function for workspace_documents
CREATE OR REPLACE FUNCTION public.workspace_documents_search_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

-- Create trigger for search vector
CREATE TRIGGER update_workspace_documents_search_vector
  BEFORE INSERT OR UPDATE ON public.workspace_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.workspace_documents_search_trigger();

-- Create updated_at trigger
CREATE TRIGGER update_workspace_documents_updated_at
  BEFORE UPDATE ON public.workspace_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add search_vector to brain_notes table
ALTER TABLE public.brain_notes ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create search trigger function for brain_notes
CREATE OR REPLACE FUNCTION public.brain_notes_search_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$;

-- Create trigger for brain_notes search vector
CREATE TRIGGER update_brain_notes_search_vector
  BEFORE INSERT OR UPDATE ON public.brain_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.brain_notes_search_trigger();

-- Update existing brain_notes to populate search_vector
UPDATE public.brain_notes SET search_vector = to_tsvector('english', COALESCE(content, ''));

-- Create universal search function
CREATE OR REPLACE FUNCTION public.search_operations(
  p_query TEXT,
  p_scope TEXT DEFAULT 'all'
)
RETURNS TABLE (
  result_type TEXT,
  result_id UUID,
  title TEXT,
  snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tsquery TSQUERY;
BEGIN
  v_tsquery := plainto_tsquery('english', p_query);
  
  RETURN QUERY
  -- Search documents
  SELECT 
    'document'::TEXT as result_type,
    d.id as result_id,
    d.name as title,
    LEFT(COALESCE(d.description, ''), 200) as snippet,
    d.created_at,
    ts_rank(d.search_vector, v_tsquery) as rank
  FROM workspace_documents d
  WHERE (p_scope = 'all' OR p_scope = 'documents')
    AND d.search_vector @@ v_tsquery
  
  UNION ALL
  
  -- Search brain notes
  SELECT 
    'brain_note'::TEXT as result_type,
    n.id as result_id,
    LEFT(n.content, 50) as title,
    LEFT(n.content, 200) as snippet,
    n.created_at,
    ts_rank(n.search_vector, v_tsquery) as rank
  FROM brain_notes n
  WHERE (p_scope = 'all' OR p_scope = 'brain_notes')
    AND n.search_vector @@ v_tsquery
  
  UNION ALL
  
  -- Search backlog items
  SELECT 
    'project'::TEXT as result_type,
    b.id as result_id,
    b.title as title,
    LEFT(COALESCE(b.description, ''), 200) as snippet,
    b.created_at,
    ts_rank(b.search_vector, v_tsquery) as rank
  FROM backlog_items b
  WHERE (p_scope = 'all' OR p_scope = 'projects')
    AND b.search_vector @@ v_tsquery
    AND b.deleted_at IS NULL
  
  ORDER BY rank DESC
  LIMIT 50;
END;
$$;
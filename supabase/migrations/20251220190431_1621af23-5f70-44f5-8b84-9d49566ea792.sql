-- Add patch-related columns to remediation_suggestions
ALTER TABLE public.remediation_suggestions 
ADD COLUMN IF NOT EXISTS patch_payload jsonb,
ADD COLUMN IF NOT EXISTS patch_text text,
ADD COLUMN IF NOT EXISTS patch_target text,
ADD COLUMN IF NOT EXISTS applied_by uuid REFERENCES auth.users(id);

-- Add check constraint for patch_target enum values
ALTER TABLE public.remediation_suggestions 
ADD CONSTRAINT remediation_suggestions_patch_target_check 
CHECK (patch_target IS NULL OR patch_target IN ('base_prompt', 'vertical_mapping', 'workflow_policy', 'default_config', 'business_facts'));

-- Add index for finding suggestions ready for patching
CREATE INDEX IF NOT EXISTS idx_remediation_suggestions_patch_status 
ON public.remediation_suggestions(status) 
WHERE status = 'approved' AND patch_text IS NULL;
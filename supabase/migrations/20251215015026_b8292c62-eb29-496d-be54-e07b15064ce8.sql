-- Create customer-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for customer-documents bucket
-- Allow customers to upload to their own folder
CREATE POLICY "Customers can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'customer-documents' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM customer_profiles WHERE user_id = auth.uid()
  )
);

-- Allow customers to read their own documents
CREATE POLICY "Customers can read their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'customer-documents' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM customer_profiles WHERE user_id = auth.uid()
  )
);

-- Allow customers to delete their own documents
CREATE POLICY "Customers can delete their own documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'customer-documents' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM customer_profiles WHERE user_id = auth.uid()
  )
);

-- Allow admins full access
CREATE POLICY "Admins have full access to customer documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'customer-documents' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND global_role IN ('super_admin', 'admin')
  )
);

-- Add content_text column to customer_knowledge_sources for parsed document content
ALTER TABLE customer_knowledge_sources 
ADD COLUMN IF NOT EXISTS content_text TEXT;
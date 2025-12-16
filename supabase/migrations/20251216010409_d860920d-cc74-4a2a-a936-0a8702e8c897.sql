-- RLS policies for affiliate-photos bucket
CREATE POLICY "Affiliates can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'affiliate-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Affiliates can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'affiliate-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Affiliates can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'affiliate-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for affiliate-voices bucket
CREATE POLICY "Affiliates can upload own voice"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'affiliate-voices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Affiliates can view own voice"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'affiliate-voices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Affiliates can delete own voice"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'affiliate-voices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin policies for viewing all storage objects
CREATE POLICY "Admins can view all affiliate photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'affiliate-photos'
  AND is_admin()
);

CREATE POLICY "Admins can view all affiliate voices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'affiliate-voices'
  AND is_admin()
);
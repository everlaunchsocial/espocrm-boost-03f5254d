-- Add admin INSERT/UPDATE/DELETE policies for affiliate storage buckets

-- Admin full access for affiliate-photos
CREATE POLICY "Admins can upload affiliate photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'affiliate-photos' AND is_admin()
);

CREATE POLICY "Admins can update affiliate photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'affiliate-photos' AND is_admin());

CREATE POLICY "Admins can delete affiliate photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'affiliate-photos' AND is_admin());

-- Admin full access for affiliate-voices
CREATE POLICY "Admins can upload affiliate voices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'affiliate-voices' AND is_admin()
);

CREATE POLICY "Admins can update affiliate voices"
ON storage.objects FOR UPDATE
USING (bucket_id = 'affiliate-voices' AND is_admin());

CREATE POLICY "Admins can delete affiliate voices"
ON storage.objects FOR DELETE
USING (bucket_id = 'affiliate-voices' AND is_admin());
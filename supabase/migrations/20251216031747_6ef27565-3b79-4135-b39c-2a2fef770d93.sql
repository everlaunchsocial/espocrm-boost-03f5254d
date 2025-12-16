-- Make affiliate-photos bucket public
UPDATE storage.buckets SET public = true WHERE id = 'affiliate-photos';

-- Make affiliate-voices bucket public  
UPDATE storage.buckets SET public = true WHERE id = 'affiliate-voices';

-- Add public read policy for affiliate-photos (keep existing RLS for write)
CREATE POLICY "Public read access for affiliate-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'affiliate-photos');

-- Add public read policy for affiliate-voices (keep existing RLS for write)
CREATE POLICY "Public read access for affiliate-voices"
ON storage.objects FOR SELECT
USING (bucket_id = 'affiliate-voices');
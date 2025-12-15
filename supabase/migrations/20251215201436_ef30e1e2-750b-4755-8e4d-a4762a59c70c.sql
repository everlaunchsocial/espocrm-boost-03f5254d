-- Fix service_usage foreign key to cascade delete when demo is deleted
ALTER TABLE service_usage 
DROP CONSTRAINT IF EXISTS service_usage_demo_id_fkey;

ALTER TABLE service_usage 
ADD CONSTRAINT service_usage_demo_id_fkey 
FOREIGN KEY (demo_id) REFERENCES demos(id) ON DELETE CASCADE;
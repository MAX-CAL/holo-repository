-- Fix STORAGE_EXPOSURE: Make bucket private and add auth-based policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'entry-images';

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can view entry images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload entry images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their entry images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their entry images" ON storage.objects;

-- Create auth-based policies that verify user ownership
CREATE POLICY "Users can view their own images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'entry-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'entry-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'entry-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entry-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix INPUT_VALIDATION: Add database constraints for input length validation

-- Access code length (users table)
ALTER TABLE users 
ADD CONSTRAINT access_code_length 
CHECK (length(access_code) >= 3 AND length(access_code) <= 100);

-- Category name length
ALTER TABLE categories 
ADD CONSTRAINT name_length
CHECK (length(name) >= 1 AND length(name) <= 200);

-- Entry title length
ALTER TABLE entries 
ADD CONSTRAINT title_length
CHECK (length(title) >= 1 AND length(title) <= 500);

-- Entry content length (100KB reasonable limit)
ALTER TABLE entries 
ADD CONSTRAINT content_length
CHECK (content IS NULL OR length(content) <= 100000);

-- Image description length
ALTER TABLE entries
ADD CONSTRAINT image_description_length
CHECK (image_description IS NULL OR length(image_description) <= 1000);

-- Tags array size (max 50 tags)
ALTER TABLE entries 
ADD CONSTRAINT tags_count
CHECK (tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 50);
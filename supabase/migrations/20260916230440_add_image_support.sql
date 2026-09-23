/*
# Add image support to design log entries

1. Schema changes
- Adds `image_url` (text, nullable) to `design_log_entries` so an update can optionally include a photo.

2. Storage
- Creates a public bucket `entry-images` for storing uploaded photos.
- Sets public read and anon+authenticated insert/update/delete policies on the bucket objects.

3. Security
- The bucket is intentionally public for this shared no-auth group workspace, matching the existing table RLS.
- Storage policies allow anon and authenticated roles to upload, read, and manage objects.

4. Notes
- The column is nullable so existing entries without images remain valid.
- Idempotent: safe to re-run.
*/

ALTER TABLE public.design_log_entries
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('entry-images', 'entry-images', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "entry_images_public_read" ON storage.objects;
CREATE POLICY "entry_images_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'entry-images');

DROP POLICY IF EXISTS "entry_images_public_insert" ON storage.objects;
CREATE POLICY "entry_images_public_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'entry-images');

DROP POLICY IF EXISTS "entry_images_public_update" ON storage.objects;
CREATE POLICY "entry_images_public_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'entry-images')
  WITH CHECK (bucket_id = 'entry-images');

DROP POLICY IF EXISTS "entry_images_public_delete" ON storage.objects;
CREATE POLICY "entry_images_public_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'entry-images');

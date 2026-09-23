/*
# Create shared design log entries

1. New Tables
- `design_log_entries` stores the group's shared work timeline.
- `id` is the unique entry identifier.
- `title` is the entry headline.
- `description` is the entry body text.
- `member_name` identifies the group member who completed the work.
- `member_color` stores the visual color used for that member's tag.
- `category` stores the work type shown in the feed.
- `created_at` stores when the entry was posted.

2. Security
- Row level security is enabled.
- This is intentionally a shared, no-sign-in class project feed, so anonymous and authenticated visitors can read and manage entries.
- Separate policies are created for select, insert, update, and delete operations.

3. Notes
- The table has no user ownership column because the product brief calls for one shared group website without accounts.
- An index supports newest-first timeline loading.
*/

CREATE TABLE IF NOT EXISTS public.design_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  member_name text NOT NULL,
  member_color text NOT NULL DEFAULT 'blue',
  category text NOT NULL DEFAULT 'Progress',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS design_log_entries_created_at_idx
  ON public.design_log_entries (created_at DESC);

ALTER TABLE public.design_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_feed_select_entries" ON public.design_log_entries;
CREATE POLICY "shared_feed_select_entries"
  ON public.design_log_entries FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "shared_feed_insert_entries" ON public.design_log_entries;
CREATE POLICY "shared_feed_insert_entries"
  ON public.design_log_entries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "shared_feed_update_entries" ON public.design_log_entries;
CREATE POLICY "shared_feed_update_entries"
  ON public.design_log_entries FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "shared_feed_delete_entries" ON public.design_log_entries;
CREATE POLICY "shared_feed_delete_entries"
  ON public.design_log_entries FOR DELETE
  TO anon, authenticated
  USING (true);

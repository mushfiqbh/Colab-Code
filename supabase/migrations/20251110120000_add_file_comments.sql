/*
  # Add File Comments Table

  ## Overview
  Adds a file_comments table to store external comments for each file.

  ## Changes
  - Creates file_comments table with references to codespaces and files
  - Adds indexes for faster lookups
  - Enables RLS with permissive policies for public access
*/

CREATE TABLE IF NOT EXISTS file_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codespace_id uuid NOT NULL REFERENCES codespaces(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  author text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_comments_file_id ON file_comments(file_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_codespace_id ON file_comments(codespace_id);

ALTER TABLE file_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view file comments"
  ON file_comments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create file comments"
  ON file_comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete file comments"
  ON file_comments FOR DELETE
  USING (true);

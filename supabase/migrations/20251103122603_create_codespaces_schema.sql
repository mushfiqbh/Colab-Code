/*
  # Create Codespaces Schema

  ## Overview
  This migration creates the database schema for a code sharing platform where users can create
  codespaces without authentication. Each codespace has a unique slug and contains files organized
  in folders.

  ## New Tables

  ### `codespaces`
  Stores codespace metadata
  - `id` (uuid, primary key) - Unique identifier
  - `slug` (text, unique) - URL-friendly unique identifier for sharing
  - `name` (text) - Display name of the codespace
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `files`
  Stores file and folder information
  - `id` (uuid, primary key) - Unique identifier
  - `codespace_id` (uuid, foreign key) - Reference to parent codespace
  - `name` (text) - File or folder name
  - `type` (text) - Either 'file' or 'folder'
  - `parent_id` (uuid, nullable) - Reference to parent folder (null for root items)
  - `content` (text, nullable) - File content (null for folders)
  - `language` (text, nullable) - Programming language/file type
  - `path` (text) - Full path for quick lookups
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - RLS enabled on all tables
  - Public read access for sharing (anyone with slug can view)
  - Public write access (no authentication required for creation/editing)

  ## Indexes
  - Index on codespace slug for fast lookups
  - Index on files.codespace_id for efficient queries
  - Index on files.parent_id for folder tree operations
*/

-- Create codespaces table
CREATE TABLE IF NOT EXISTS codespaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Codespace',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codespace_id uuid NOT NULL REFERENCES codespaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('file', 'folder')),
  parent_id uuid REFERENCES files(id) ON DELETE CASCADE,
  content text,
  language text,
  path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_codespaces_slug ON codespaces(slug);
CREATE INDEX IF NOT EXISTS idx_files_codespace_id ON files(codespace_id);
CREATE INDEX IF NOT EXISTS idx_files_parent_id ON files(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);

-- Enable Row Level Security
ALTER TABLE codespaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Codespaces policies: Allow public read and write (no auth required)
CREATE POLICY "Anyone can view codespaces"
  ON codespaces FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create codespaces"
  ON codespaces FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update codespaces"
  ON codespaces FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete codespaces"
  ON codespaces FOR DELETE
  USING (true);

-- Files policies: Allow public read and write (no auth required)
CREATE POLICY "Anyone can view files"
  ON files FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create files"
  ON files FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update files"
  ON files FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete files"
  ON files FOR DELETE
  USING (true);

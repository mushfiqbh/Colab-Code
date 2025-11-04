/*
  # Add Online Users Tracking

  ## Overview
  This migration adds a table to track online users for each codespace using Supabase real-time presence.

  ## New Tables

  ### `online_users`
  Stores online user presence for real-time tracking
  - `id` (uuid, primary key) - Unique identifier
  - `codespace_id` (uuid, foreign key) - Reference to codespace
  - `user_id` (text) - Unique user identifier (could be session ID or anonymous ID)
  - `last_seen` (timestamptz) - Last activity timestamp
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - RLS enabled
  - Public read/write access for presence tracking
*/

-- Create online_users table
CREATE TABLE IF NOT EXISTS online_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codespace_id uuid NOT NULL REFERENCES codespaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(codespace_id, user_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_online_users_codespace_id ON online_users(codespace_id);
CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON online_users(last_seen);

-- Enable RLS
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- Allow public access for presence tracking
CREATE POLICY "Allow public access to online_users" ON online_users
  FOR ALL USING (true);
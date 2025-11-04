/*
  # Add Visitor Count to Codespaces

  ## Overview
  This migration adds a visitor_count field to the codespaces table to track how many times
  each codespace has been visited.

  ## Changes

  ### `codespaces` table
  - Add `visitor_count` (integer, default 0) - Number of times the codespace has been visited
*/

-- Add visitor_count column to codespaces table
ALTER TABLE codespaces
ADD COLUMN visitor_count integer DEFAULT 0;

-- Update RLS policies to allow incrementing visitor count
-- (This is already public, so no changes needed)
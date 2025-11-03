-- Add is_locked column to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- Create index for locked files for better performance
CREATE INDEX IF NOT EXISTS idx_files_is_locked ON files(is_locked);

-- Update the updated_at timestamp when is_locked changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists for files table
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
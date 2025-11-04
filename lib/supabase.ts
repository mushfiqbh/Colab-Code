import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase credentials not found');
      return null;
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
};

export const supabase = getSupabase();

export type Codespace = {
  id: string;
  slug: string;
  name: string;
  visitor_count: number;
  created_at: string;
  updated_at: string;
};

export type OnlineUser = {
  id: string;
  codespace_id: string;
  user_id: string;
  last_seen: string;
  created_at: string;
};

export type FileItem = {
  id: string;
  codespace_id: string;
  name: string;
  type: 'file' | 'folder';
  parent_id: string | null;
  content: string | null;
  language: string | null;
  path: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
};

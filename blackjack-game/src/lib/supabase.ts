import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TypeScript types for our database
export type Profile = {
  id: string;
  email: string;
  chips: number;
  created_at: string;
  updated_at: string;
};

export type GameHistory = {
  id: string;
  user_id: string;
  player_hand: any;
  dealer_hand: any;
  result: 'win' | 'loss' | 'push';
  bet: number;
  created_at: string;
};
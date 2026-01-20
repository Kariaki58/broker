import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Using fallback mode.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We handle sessions manually
    autoRefreshToken: false,
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          role: 'user' | 'admin';
          wallet_address: string | null;
          deposit_address: string | null;
          referral_code: string;
          created_at: string;
          last_login: string;
          is_active: boolean;
        };
        Insert: {
          id: string;
          email: string;
          password_hash: string;
          role?: 'user' | 'admin';
          wallet_address?: string | null;
          deposit_address?: string | null;
          referral_code: string;
          created_at?: string;
          last_login?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          role?: 'user' | 'admin';
          wallet_address?: string | null;
          deposit_address?: string | null;
          referral_code?: string;
          last_login?: string;
          is_active?: boolean;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
        };
      };
      balances: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          updated_at?: string;
        };
      };
      mining_records: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          amount: number;
          start_date: string;
          daily_yield: number;
          total_earnings: number;
          last_withdrawal: string | null;
          next_withdrawal: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          amount: number;
          start_date: string;
          daily_yield: number;
          total_earnings?: number;
          last_withdrawal?: string | null;
          next_withdrawal: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          amount?: number;
          start_date?: string;
          daily_yield?: number;
          total_earnings?: number;
          last_withdrawal?: string | null;
          next_withdrawal?: string;
        };
      };
      referral_records: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          email: string;
          joined_date: string;
          status: 'active' | 'pending';
          total_earnings: number;
          pending_earnings: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          email: string;
          joined_date: string;
          status?: 'active' | 'pending';
          total_earnings?: number;
          pending_earnings?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          email?: string;
          joined_date?: string;
          status?: 'active' | 'pending';
          total_earnings?: number;
          pending_earnings?: number;
        };
      };
      referral_transactions: {
        Row: {
          id: string;
          referral_id: string;
          type: 'investment' | 'withdrawal';
          amount: number;
          commission: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          referral_id: string;
          type: 'investment' | 'withdrawal';
          amount: number;
          commission: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          referral_id?: string;
          type?: 'investment' | 'withdrawal';
          amount?: number;
          commission?: number;
          date?: string;
        };
      };
      processed_transactions: {
        Row: {
          id: string;
          tx_hash: string;
          user_id: string | null;
          processed_at: string;
        };
        Insert: {
          id?: string;
          tx_hash: string;
          user_id?: string | null;
          processed_at?: string;
        };
        Update: {
          id?: string;
          tx_hash?: string;
          user_id?: string | null;
          processed_at?: string;
        };
      };
      user_wallet_addresses: {
        Row: {
          id: string;
          user_id: string;
          wallet_address: string;
          label: string;
          is_primary: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_address: string;
          label: string;
          is_primary?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          wallet_address?: string;
          label?: string;
          is_primary?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}


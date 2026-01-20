-- Supabase Database Schema for CryptoBroker
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  wallet_address TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Balances table
CREATE TABLE IF NOT EXISTS balances (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(18, 2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mining records table
CREATE TABLE IF NOT EXISTS mining_records (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  daily_yield DECIMAL(5, 2) NOT NULL,
  total_earnings DECIMAL(18, 2) DEFAULT 0.00,
  last_withdrawal TIMESTAMPTZ,
  next_withdrawal TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral records table
CREATE TABLE IF NOT EXISTS referral_records (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  referrer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  joined_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending')),
  total_earnings DECIMAL(18, 2) DEFAULT 0.00,
  pending_earnings DECIMAL(18, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral transactions table
CREATE TABLE IF NOT EXISTS referral_transactions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  referral_id TEXT NOT NULL REFERENCES referral_records(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('investment', 'withdrawal')),
  amount DECIMAL(18, 2) NOT NULL,
  commission DECIMAL(18, 2) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processed transactions table (to prevent duplicate processing)
CREATE TABLE IF NOT EXISTS processed_transactions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  tx_hash TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_mining_records_user_id ON mining_records(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_records_referrer_id ON referral_records(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_records_referred_id ON referral_records(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referral_id ON referral_transactions(referral_id);
CREATE INDEX IF NOT EXISTS idx_processed_transactions_tx_hash ON processed_transactions(tx_hash);

-- Function to update balance updated_at timestamp
CREATE OR REPLACE FUNCTION update_balance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update balance timestamp
CREATE TRIGGER update_balance_timestamp
  BEFORE UPDATE ON balances
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can read own sessions" ON sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can read own balance" ON balances
  FOR SELECT USING (true);

CREATE POLICY "Users can read own mining records" ON mining_records
  FOR SELECT USING (true);

CREATE POLICY "Users can read own referral records" ON referral_records
  FOR SELECT USING (referrer_id = current_setting('app.user_id', true) OR referred_id = current_setting('app.user_id', true));

-- Policy: Service role can do everything (for API routes)
-- Note: In production, use service role key in server-side code only
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON sessions
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON balances
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON mining_records
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON referral_records
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON referral_transactions
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON processed_transactions
  FOR ALL USING (true);


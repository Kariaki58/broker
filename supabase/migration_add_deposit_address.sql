-- Migration: Add deposit_address column to users table if it doesn't exist
-- Run this in your Supabase SQL Editor if you get "deposit_address column not found" error

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'deposit_address'
    ) THEN
        ALTER TABLE users ADD COLUMN deposit_address TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_deposit_address ON users (deposit_address);
        RAISE NOTICE 'Column deposit_address added to users table';
    ELSE
        RAISE NOTICE 'Column deposit_address already exists';
    END IF;
END $$;


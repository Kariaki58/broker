# Supabase Setup Guide

This application uses Supabase as the database backend. Follow these steps to set up Supabase for your project.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - **Name**: Your project name (e.g., "CryptoBroker")
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (takes ~2 minutes)

## 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need these values:
   - **Project URL**: Found under "Project URL" (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**: Found under "Project API keys" → "anon public"
   - **service_role key**: Found under "Project API keys" → "service_role" (⚠️ Keep this secret!)

## 3. Run the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the contents of `supabase/schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. Verify that all tables were created successfully

## 4. Configure Environment Variables

Create or update your `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Existing environment variables
TRUST_WALLET_ADDRESS=your-trust-wallet-address
NEXT_PUBLIC_TRUST_WALLET_ADDRESS=your-trust-wallet-address
RPC_URL=https://eth.llamarpc.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Important Security Notes:**
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose in client-side code
- `SUPABASE_SERVICE_ROLE_KEY` should **NEVER** be exposed to the client. It's only used in server-side API routes.
- Never commit `.env.local` to version control (it's already in `.gitignore`)

## 5. Verify the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try registering a new user at `http://localhost:3000/register`
3. Check your Supabase dashboard → **Table Editor** to see if data was created:
   - `users` table should have a new row
   - `balances` table should have a new row with balance = 0
   - `sessions` table should have a new session

## 6. Database Tables Overview

The schema creates the following tables:

- **users**: User accounts with authentication info
- **sessions**: Active user sessions
- **balances**: User account balances
- **mining_records**: Active mining investments
- **referral_records**: Referral relationships
- **referral_transactions**: Referral commission transactions
- **processed_transactions**: Blockchain transaction tracking (prevents duplicates)

## 7. Row Level Security (RLS)

The schema includes Row Level Security policies. By default:
- Service role has full access (used in API routes)
- Users can read their own data

For production, you may want to customize RLS policies based on your security requirements.

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env.local` exists and contains all required variables
- Restart your development server after adding environment variables

### "relation does not exist" error
- Make sure you ran the SQL schema in the Supabase SQL Editor
- Check that all tables were created successfully

### Authentication not working
- Verify that the `sessions` table exists
- Check that session tokens are being created in the database
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Data not persisting
- Check that you're using the Supabase stores (not the old in-memory stores)
- Verify your Supabase project is active and not paused
- Check the Supabase dashboard logs for errors

## Next Steps

- Set up database backups in Supabase dashboard
- Configure email authentication if needed
- Set up database functions for complex queries
- Add indexes for better performance on large datasets
- Configure connection pooling for production


# Production Deployment Guide

This guide covers deploying the transaction system to production.

## Prerequisites

1. **Supabase Project**: Set up and configured with the schema from `supabase/schema.sql`
2. **Environment Variables**: Configure all required environment variables
3. **Cron Job Service**: Set up automatic deposit checking (Vercel Cron, GitHub Actions, etc.)

## Environment Variables

Create a `.env.local` file (or set in your hosting platform) with the following:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Wallet Configuration
TRUST_WALLET_ADDRESS=0xbb2ced410523ec22fb7ee3008574efb7faefc6a5
NEXT_PUBLIC_TRUST_WALLET_ADDRESS=0xbb2ced410523ec22fb7ee3008574efb7faefc6a5

# Blockchain RPC
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
# Or use a premium RPC provider for better reliability:
# BSC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY

# Cron Job Security (optional but recommended)
CRON_SECRET=your-random-secret-token-here

# App URL (for cron job callbacks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Database Setup

1. Run the SQL schema from `supabase/schema.sql` in your Supabase SQL Editor
2. Verify all tables are created:
   - `users`
   - `sessions`
   - `balances`
   - `mining_records`
   - `referral_records`
   - `referral_transactions`
   - `processed_transactions`
   - `transactions` (newly added)

## Automatic Deposit Checking

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/deposits/cron",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

This runs every 2 minutes. Adjust the schedule as needed:
- `*/1 * * * *` - Every minute
- `*/2 * * * *` - Every 2 minutes
- `*/5 * * * *` - Every 5 minutes

### Option 2: GitHub Actions

Create `.github/workflows/check-deposits.yml`:

```yaml
name: Check Deposits

on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-deposits:
    runs-on: ubuntu-latest
    steps:
      - name: Call Deposit Check API
        run: |
          curl -X POST https://your-domain.com/api/deposits/cron \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: External Cron Service

Use services like:
- **Cron-job.org**: Free cron service
- **EasyCron**: Reliable cron service
- **AWS EventBridge**: For AWS deployments

Configure to call: `POST https://your-domain.com/api/deposits/cron`

## Security Considerations

### 1. Protect Cron Endpoint

Set `CRON_SECRET` environment variable and ensure your cron service sends:
```
Authorization: Bearer your-cron-secret
```

### 2. Rate Limiting

Consider adding rate limiting to API routes in production. Example using `next-rate-limit`:

```bash
npm install next-rate-limit
```

### 3. RPC Provider

For production, use a premium RPC provider:
- **NodeReal**: https://nodereal.io
- **Ankr**: https://www.ankr.com
- **QuickNode**: https://www.quicknode.com

Free public RPCs may have rate limits.

### 4. Error Monitoring

Set up error monitoring:
- **Sentry**: https://sentry.io
- **LogRocket**: https://logrocket.com
- **Vercel Analytics**: Built-in for Vercel

## User Wallet Address Registration

Users must register their wallet address in their account profile for automatic deposit matching. The system matches deposits by comparing the transaction "from" address with registered wallet addresses.

## Transaction Flow

1. **User sends deposit** (BNB, USDT, or USDC) to Trust Wallet address
2. **Cron job runs** every 1-2 minutes
3. **System checks** last 20 blocks for new transactions
4. **Matches deposit** to user by wallet address
5. **Verifies transaction** status (must be confirmed)
6. **Creates transaction record** in database
7. **Updates user balance** automatically
8. **Marks transaction** as processed (prevents duplicates)

## Monitoring

### Check Deposit Status

Monitor the cron job:
```bash
curl https://your-domain.com/api/deposits/cron \
  -H "Authorization: Bearer your-cron-secret"
```

### View Transaction Logs

Query the `transactions` table in Supabase:
```sql
SELECT * FROM transactions 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Check Processed Transactions

```sql
SELECT COUNT(*) as total_processed 
FROM processed_transactions 
WHERE processed_at > NOW() - INTERVAL '24 hours';
```

## Troubleshooting

### Deposits Not Detected

1. **Check RPC connection**: Verify `BSC_RPC_URL` is working
2. **Check wallet address**: Ensure `TRUST_WALLET_ADDRESS` is correct
3. **Check user wallet**: User must have registered wallet address
4. **Check blocks**: System checks last 20 blocks - older transactions won't be detected
5. **Check logs**: Review server logs for errors

### Balance Not Updating

1. **Check transaction status**: Must be confirmed (status = 1)
2. **Check user matching**: Wallet address must match registered address
3. **Check duplicate prevention**: Transaction may already be processed
4. **Check database**: Verify transaction record was created

### Rate Limiting Issues

1. **Upgrade RPC provider**: Use premium RPC service
2. **Reduce check frequency**: Increase cron interval
3. **Reduce blocks checked**: Change `blocksToCheck` in code (not recommended)

## Performance Optimization

1. **Database Indexes**: Already created in schema
2. **Batch Processing**: System processes multiple deposits efficiently
3. **Error Handling**: Continues processing even if one transaction fails
4. **Caching**: Consider caching user wallet addresses

## Support

For issues or questions:
1. Check server logs
2. Review transaction records in database
3. Verify environment variables
4. Test RPC connection

## Production Checklist

- [ ] Supabase project configured
- [ ] Database schema applied
- [ ] Environment variables set
- [ ] Cron job configured
- [ ] CRON_SECRET set (if using)
- [ ] Premium RPC provider configured (recommended)
- [ ] Error monitoring set up
- [ ] Test deposit processed successfully
- [ ] Transaction records created
- [ ] User balances updating correctly


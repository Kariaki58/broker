# TRC-20 Payment Testing Guide

This guide explains how to test Tron TRC-20 payments in your application, including both real blockchain transactions and test payments.

## Table of Contents
1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Test Payment Endpoint](#test-payment-endpoint)
4. [Real Transaction Testing](#real-transaction-testing)
5. [Verification Steps](#verification-steps)
6. [Troubleshooting](#troubleshooting)

## Overview

The application supports Tron TRC-20 tokens (USDT, USDC) for deposits. There are two ways to test:

1. **Test Payment Endpoint** - Simulates deposits without real blockchain transactions (development only)
2. **Real Blockchain Transactions** - Uses actual Tron network transactions

## Environment Setup

### Required Environment Variables

Create a `.env.local` file with the following variables:

```env
# Tron Configuration
NEXT_PUBLIC_TRUST_WALLET_ADDRESS=TLPLm1HZaBqG3cysDg321ebV9gfETxFcTy
TRUST_WALLET_ADDRESS=TLPLm1HZaBqG3cysDg321ebV9gfETxFcTy

# Tron RPC Configuration
RPC_URL=https://api.trongrid.io
TRON_PRO_API_KEY=your-tron-pro-api-key-here

# Enable Test Payments (only for development)
ENABLE_TEST_PAYMENTS=true
NODE_ENV=development

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting a Tron API Key

1. Visit [TronGrid](https://www.trongrid.io/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to `.env.local` as `TRON_PRO_API_KEY`

**Note**: The free tier is sufficient for testing. For production, consider a paid plan for better rate limits.

## Test Payment Endpoint

The test payment endpoint allows you to simulate deposits without real blockchain transactions. This is useful for:
- Quick testing during development
- Testing the payment flow without spending real tokens
- Debugging balance updates and transaction recording

### Enabling Test Payments

Test payments are only available in development mode by default. To enable:

1. Set `NODE_ENV=development` in your `.env.local`
2. Or set `ENABLE_TEST_PAYMENTS=true` (use with caution in production)

### Using the Test Payment Endpoint

**Endpoint**: `POST /api/deposits/test`

**Request Body**:
```json
{
  "userId": "user-id-here",
  "amount": 100,
  "symbol": "USDT",
  "fromAddress": "TYourWalletAddressHere...",
  "network": "TRON",
  "usdValue": 100
}
```

**Required Fields**:
- `userId` - The user ID to credit the deposit to
- `amount` - Amount of tokens (e.g., 100 USDT)
- `symbol` - Token symbol: `USDT`, `USDC`, or `TRX`

**Optional Fields**:
- `fromAddress` - Wallet address (must be registered to the user)
- `network` - Network type (defaults to `TRON`)
- `usdValue` - USD value (auto-calculated if not provided)

**Example using cURL**:
```bash
curl -X POST http://localhost:3000/api/deposits/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "amount": 50,
    "symbol": "USDT",
    "fromAddress": "TYourTronWalletAddress",
    "network": "TRON"
  }'
```

**Example using JavaScript (Frontend)**:
```javascript
const response = await fetch('/api/deposits/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'your-user-id',
    amount: 100,
    symbol: 'USDT',
    fromAddress: 'TYourTronWalletAddress',
    network: 'TRON'
  })
});

const result = await response.json();
console.log('Test payment result:', result);
```

**Response**:
```json
{
  "success": true,
  "message": "Test payment processed successfully",
  "txHash": "test_1234567890_abc123",
  "amount": 100,
  "symbol": "USDT",
  "usdValue": 100,
  "userId": "user-id",
  "userEmail": "user@example.com",
  "newBalance": 1000,
  "network": "TRON",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "note": "This is a test transaction. In production, use real blockchain transactions."
}
```

## Real Transaction Testing

For production-like testing, use real Tron TRC-20 transactions.

### Prerequisites

1. **Tron Wallet**: Use TronLink browser extension or TronGrid wallet
2. **Testnet Tokens**: Get testnet USDT/USDC from Tron Shasta testnet faucet
3. **Registered Wallet**: Register your wallet address in your user account

### Step 1: Register Your Wallet Address

1. Log into your account
2. Go to Wallet Settings or Account Settings
3. Add your Tron wallet address
4. Save the address

**Important**: The deposit system matches deposits by the sending wallet address (`fromAddress`). Make sure your wallet address is registered before sending deposits.

### Step 2: Send a Real Transaction

1. Open your Tron wallet (TronLink, Trust Wallet, etc.)
2. Send USDT or USDC to the master wallet address:
   - **Master Address**: `TLPLm1HZaBqG3cysDg321ebV9gfETxFcTy` (or your configured address)
3. Make sure you're sending from your registered wallet address
4. Wait for confirmation (usually 1-3 minutes)

### Step 3: Check for Deposits

The system automatically checks for deposits, but you can manually trigger a check:

**Using the Frontend**:
1. Go to the Deposit page
2. Click "Check Status" button

**Using API**:
```bash
curl -X POST http://localhost:3000/api/deposits/check \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": true,
  "newDeposits": [
    {
      "txHash": "abc123...",
      "from": "TYourWalletAddress",
      "amount": 100,
      "symbol": "USDT",
      "usdValue": 100,
      "status": "confirmed",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ],
  "processedCount": 1
}
```

### Automatic Deposit Checking

The system includes automatic deposit checking:

1. **Frontend Auto-Check**: The deposit page automatically checks every 30 seconds
2. **Cron Job**: Set up a cron job to call `/api/deposits/cron` every 1-2 minutes

**Setting up Vercel Cron** (if using Vercel):
```json
// vercel.json
{
  "crons": [{
    "path": "/api/deposits/cron",
    "schedule": "*/2 * * * *"
  }]
}
```

**Manual Cron Setup**:
```bash
# Add to crontab (runs every 2 minutes)
*/2 * * * * curl -X POST https://your-app.com/api/deposits/cron -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Verification Steps

After processing a payment (test or real), verify:

### 1. Transaction Record Created

Check the `transactions` table in Supabase:
```sql
SELECT * FROM transactions 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

Expected fields:
- `tx_hash` - Transaction hash (or test hash for test payments)
- `type` - Should be `deposit`
- `status` - Should be `confirmed`
- `network` - Should be `TRON`
- `amount` - Token amount
- `symbol` - Token symbol (USDT/USDC)
- `usd_value` - USD equivalent

### 2. Balance Updated

Check the `balances` table:
```sql
SELECT * FROM balances WHERE user_id = 'your-user-id';
```

The balance should be increased by the USD value of the deposit.

### 3. Transaction Marked as Processed

Check the `processed_transactions` table:
```sql
SELECT * FROM processed_transactions 
WHERE tx_hash = 'your-transaction-hash';
```

This prevents duplicate processing.

### 4. Check User Wallet Addresses

Verify your wallet address is registered:
```sql
SELECT * FROM user_wallet_addresses 
WHERE user_id = 'your-user-id' AND is_active = true;
```

Or check the users table:
```sql
SELECT wallet_address FROM users WHERE id = 'your-user-id';
```

## Troubleshooting

### Test Payment Issues

**Error: "Test payment endpoint is disabled in production"**
- Solution: Set `ENABLE_TEST_PAYMENTS=true` or `NODE_ENV=development`

**Error: "User not found"**
- Solution: Verify the `userId` is correct and exists in the database

**Error: "Wallet address does not belong to this user"**
- Solution: Register the wallet address in your account settings first

### Real Transaction Issues

**Deposits not being detected:**
1. Check that your wallet address is registered in the system
2. Verify you sent tokens from your registered address (not another address)
3. Confirm the transaction was sent to the correct master wallet address
4. Check that the token type is supported (USDT or USDC on TRON)
5. Verify the transaction is confirmed on TronScan

**Transaction found but user not matched:**
1. Ensure your wallet address is registered in `user_wallet_addresses` or `users.wallet_address`
2. Check address case sensitivity (Tron addresses are case-sensitive)
3. Verify the address matches exactly (no extra spaces)

**API Errors:**
1. Check your `TRON_PRO_API_KEY` is set correctly
2. Verify `RPC_URL` is correct (default: `https://api.trongrid.io`)
3. Check rate limits on your TronGrid API key
4. Review server logs for detailed error messages

### Common Issues

**Duplicate Processing:**
- The system prevents duplicates using the `processed_transactions` table
- If a transaction is processed twice, check the logs to see why

**Incorrect USD Value:**
- Token prices are defined in `app/lib/tokenContracts.ts`
- USDT and USDC default to $1.00
- You can override by providing `usdValue` in the request

**Network Mismatch:**
- The `process` endpoint now supports a `network` parameter
- Defaults to `TRON` if not specified
- Supported networks: `TRON`, `BSC`, `ETH`, `BSC_TESTNET`

## Testing Checklist

Use this checklist to ensure everything works:

- [ ] Environment variables configured correctly
- [ ] Tron API key is valid and has sufficient rate limits
- [ ] Test payment endpoint works (in development mode)
- [ ] Wallet address registered in user account
- [ ] Real transaction sent from registered address
- [ ] Transaction visible on TronScan
- [ ] Deposit check finds the transaction
- [ ] Transaction record created in database
- [ ] User balance updated correctly
- [ ] Transaction marked as processed
- [ ] No duplicate processing
- [ ] Frontend shows updated balance
- [ ] Transaction appears in transaction history

## Production Considerations

Before going to production:

1. **Disable Test Payments**: Remove `ENABLE_TEST_PAYMENTS` or set to `false`
2. **Secure Cron Endpoint**: Add authentication to `/api/deposits/cron` using `CRON_SECRET`
3. **Monitor Rate Limits**: Ensure your TronGrid API key has sufficient limits
4. **Set Up Alerts**: Monitor for failed deposit checks or processing errors
5. **Backup Strategy**: Regularly backup transaction records
6. **Security Audit**: Review all deposit processing logic for security issues
7. **Load Testing**: Test the system under expected transaction volumes

## Additional Resources

- [TronGrid API Documentation](https://www.trongrid.io/)
- [TronScan Explorer](https://tronscan.org/)
- [TronLink Wallet](https://www.tronlink.org/)
- [Tron TRC-20 Standard](https://developers.tron.network/docs/trc20)

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with the test payment endpoint first
4. Use TronScan to verify blockchain transactions
5. Check database records to understand the processing state

For additional help, review the code in:
- `/app/api/deposits/check/route.ts` - Deposit checking logic
- `/app/api/deposits/process/route.ts` - Manual deposit processing
- `/app/api/deposits/test/route.ts` - Test payment endpoint
- `/app/lib/tokenContracts.ts` - Token configuration


# How to Check User Balances

There are several ways to check user balances in the system:

## Method 1: Admin API Endpoint (Recommended)

Use the admin endpoint to get all user balances with their details:

```bash
curl -X GET http://localhost:3000/api/admin/balances \
  -H "x-session-token: <your-session-token>"
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalUsers": 10,
    "usersWithBalance": 5,
    "totalBalance": 1250.50
  },
  "users": [
    {
      "userId": "user-123",
      "email": "user@example.com",
      "balance": 500.00,
      "depositAddress": "TWNHpaEhG74DzEBMDR6qxg1JiMDU62FGGT",
      "lastUpdated": "2024-01-01T12:00:00Z",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    ...
  ]
}
```

## Method 2: Direct SQL Query (Supabase)

Run this SQL in your Supabase SQL Editor:

### Get all user balances with email:
```sql
SELECT 
  u.id AS user_id,
  u.email,
  u.deposit_address,
  COALESCE(b.balance, 0.00) AS balance,
  b.updated_at AS balance_updated_at,
  u.created_at AS user_created_at
FROM users u
LEFT JOIN balances b ON u.id = b.user_id
WHERE u.is_active = true
ORDER BY COALESCE(b.balance, 0.00) DESC;
```

### Get only users with positive balances:
```sql
SELECT 
  u.id AS user_id,
  u.email,
  u.deposit_address,
  b.balance,
  b.updated_at
FROM users u
INNER JOIN balances b ON u.id = b.user_id
WHERE b.balance > 0
ORDER BY b.balance DESC;
```

### Get total balance across all users:
```sql
SELECT 
  COUNT(DISTINCT u.id) AS total_users,
  COUNT(DISTINCT b.user_id) AS users_with_balance,
  COALESCE(SUM(b.balance), 0) AS total_balance
FROM users u
LEFT JOIN balances b ON u.id = b.user_id
WHERE u.is_active = true;
```

### Get balance for a specific user:
```sql
SELECT 
  u.id,
  u.email,
  u.deposit_address,
  COALESCE(b.balance, 0.00) AS balance
FROM users u
LEFT JOIN balances b ON u.id = b.user_id
WHERE u.email = 'user@example.com';
```

## Method 3: Check Individual User Balance

### Via API (requires user to be logged in):
```bash
curl -X GET http://localhost:3000/api/account/balance \
  -H "x-session-token: <user-session-token>"
```

### Via SQL:
```sql
SELECT balance 
FROM balances 
WHERE user_id = 'user-123';
```

## Method 4: Check Deposit Address Balances on Tron

To check the actual TRC-20 token balances on each deposit address:

1. **Via TronScan**: Visit `https://tronscan.org/#/address/<deposit_address>`
   - Example: `https://tronscan.org/#/address/TWNHpaEhG74DzEBMDR6qxg1JiMDU62FGGT`

2. **Via API** (using TronGrid):
```bash
curl "https://api.trongrid.io/v1/accounts/TWNHpaEhG74DzEBMDR6qxg1JiMDU62FGGT/trc20?limit=20" \
  -H "TRON-PRO-API-KEY: <your-api-key>"
```

## Method 5: Get All Deposit Addresses with Balances

SQL query to get all deposit addresses and their associated users:

```sql
SELECT 
  uwa.wallet_address AS deposit_address,
  u.id AS user_id,
  u.email,
  uwa.is_primary,
  uwa.is_active,
  COALESCE(b.balance, 0.00) AS account_balance,
  uwa.created_at AS address_created_at
FROM user_wallet_addresses uwa
INNER JOIN users u ON uwa.user_id = u.id
LEFT JOIN balances b ON u.id = b.user_id
WHERE uwa.purpose = 'deposit'
  AND uwa.is_active = true
ORDER BY COALESCE(b.balance, 0.00) DESC;
```

## Notes

- **Account Balance**: The balance stored in the `balances` table (what users see in the app)
- **On-Chain Balance**: The actual TRC-20 tokens sitting in deposit addresses (check via TronScan)
- These may differ if:
  - Deposits haven't been detected yet
  - Funds have been swept to the central wallet
  - There are pending transactions

## Quick Balance Check Script

Create a file `check-balances.js`:

```javascript
const fetch = require('node-fetch');

async function checkBalances(sessionToken) {
  const response = await fetch('http://localhost:3000/api/admin/balances', {
    headers: { 'x-session-token': sessionToken }
  });
  
  const data = await response.json();
  
  console.log('\n=== User Balances Summary ===');
  console.log(`Total Users: ${data.summary.totalUsers}`);
  console.log(`Users with Balance: ${data.summary.usersWithBalance}`);
  console.log(`Total Balance: $${data.summary.totalBalance.toFixed(2)}\n`);
  
  console.log('=== Top 10 Users by Balance ===');
  data.users.slice(0, 10).forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}: $${user.balance.toFixed(2)}`);
  });
}

// Usage: node check-balances.js <session-token>
checkBalances(process.argv[2]);
```

Run: `node check-balances.js <your-session-token>`


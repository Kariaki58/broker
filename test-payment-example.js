/**
 * Example script to test TRC-20 payments
 * 
 * Usage:
 * 1. Replace the placeholder values with your actual user ID and wallet address
 * 2. Run: node test-payment-example.js
 * 
 * Or use in browser console (make sure you're logged in):
 *  - Copy the testPayment function
 *  - Replace userId with your actual user ID
 *  - Call: testPayment()
 */

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change to your API URL
const USER_ID = 'your-user-id-here'; // Replace with your actual user ID
const WALLET_ADDRESS = 'TYourTronWalletAddressHere'; // Replace with your registered Tron wallet address

/**
 * Test Payment Function
 */
async function testPayment() {
  try {
    console.log('Testing payment endpoint...');
    
    const response = await fetch(`${API_BASE_URL}/api/deposits/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: USER_ID,
        amount: 100, // Amount in tokens (e.g., 100 USDT)
        symbol: 'USDT', // USDT, USDC, or TRX
        fromAddress: WALLET_ADDRESS,
        network: 'TRON',
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test payment successful!');
      console.log('Transaction Hash:', result.txHash);
      console.log('Amount:', result.amount, result.symbol);
      console.log('USD Value:', `$${result.usdValue}`);
      console.log('New Balance:', `$${result.newBalance}`);
      console.log('Full response:', result);
    } else {
      console.error('❌ Test payment failed:', result.error);
      console.error('Details:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Check Deposits Function
 */
async function checkDeposits() {
  try {
    console.log('Checking for deposits...');
    
    const response = await fetch(`${API_BASE_URL}/api/deposits/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Deposit check successful!');
      console.log('New deposits found:', result.processedCount);
      if (result.newDeposits && result.newDeposits.length > 0) {
        result.newDeposits.forEach((deposit, index) => {
          console.log(`\nDeposit ${index + 1}:`);
          console.log('  Hash:', deposit.txHash);
          console.log('  From:', deposit.from);
          console.log('  Amount:', deposit.amount, deposit.symbol);
          console.log('  USD Value:', `$${deposit.usdValue}`);
          console.log('  Status:', deposit.status);
        });
      } else {
        console.log('No new deposits found.');
      }
    } else {
      console.error('❌ Deposit check failed:', result.error);
      console.error('Details:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Manual Deposit Processing
 */
async function processDeposit(txHash, amount, symbol, fromAddress, userId = USER_ID) {
  try {
    console.log('Processing deposit manually...');
    
    const response = await fetch(`${API_BASE_URL}/api/deposits/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        txHash,
        amount,
        symbol,
        fromAddress,
        userId,
        network: 'TRON',
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Deposit processed successfully!');
      console.log('Transaction Hash:', result.txHash);
      console.log('New Balance:', `$${result.newBalance}`);
    } else {
      console.error('❌ Deposit processing failed:', result.error);
      console.error('Details:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Export functions for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testPayment,
    checkDeposits,
    processDeposit,
  };
}

// If running directly, execute test
if (require.main === module) {
  console.log('🧪 TRC-20 Payment Test Script');
  console.log('================================\n');
  
  // Update these values before running
  if (USER_ID === 'your-user-id-here') {
    console.error('❌ Please update USER_ID and WALLET_ADDRESS in this file before running!');
    process.exit(1);
  }
  
  // Run test payment
  testPayment()
    .then(() => {
      console.log('\n✅ Test completed!');
      console.log('\nNext steps:');
      console.log('1. Check your account balance to verify the deposit');
      console.log('2. Check the transactions table in your database');
      console.log('3. Try checkDeposits() to see automatic deposit checking');
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}


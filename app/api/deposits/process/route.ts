import { NextRequest, NextResponse } from 'next/server';
import { 
  isTransactionProcessed, 
  markTransactionProcessed,
  updateUserBalance 
} from '@/app/lib/balanceStore';
import { TOKEN_PRICES } from '@/app/lib/tokenContracts';

// This endpoint is now mainly for manual processing or webhook callbacks
// The main deposit checking happens in /api/deposits/check
// In production, this would be triggered by:
// - Webhook from blockchain monitoring service
// - Scheduled job checking for new transactions
// - Event listener on blockchain

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, amount, symbol, fromAddress, userId, usdValue } = body;

    if (!txHash || !amount || !symbol) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if already processed (prevent duplicates)
    if (isTransactionProcessed(txHash)) {
      return NextResponse.json({
        success: true,
        message: 'Transaction already processed',
        txHash,
      });
    }

    // In production:
    // 1. Verify transaction on blockchain
    // 2. Match deposit to user (via userId, fromAddress, or memo)
    // 3. Create transaction record in database
    // 4. Send notification to user

    // Calculate USD value if not provided
    const calculatedUsdValue = usdValue || (amount * (TOKEN_PRICES[symbol] || 0));
    
    if (calculatedUsdValue <= 0) {
      return NextResponse.json(
        { error: 'Invalid USD value' },
        { status: 400 }
      );
    }

    // Update user balance directly (no HTTP call needed)
    const targetUserId = userId || 'default-user';
    const newBalance = updateUserBalance(targetUserId, calculatedUsdValue);
    
    // Mark as processed
    markTransactionProcessed(txHash, targetUserId);

    return NextResponse.json({
      success: true,
      txHash,
      amount,
      symbol,
      usdValue: calculatedUsdValue,
      userId: targetUserId,
      newBalance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Deposit processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process deposit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { 
  isTransactionProcessed, 
  markTransactionProcessed,
  updateUserBalance 
} from '@/app/lib/supabaseBalanceStore';
import { TOKEN_PRICES } from '@/app/lib/tokenContracts';
import { createServerClient } from '@/app/lib/supabaseClient';

// This endpoint is for manual processing or webhook callbacks
// The main deposit checking happens in /api/deposits/check
// In production, this can be triggered by:
// - Webhook from blockchain monitoring service
// - Scheduled job checking for new transactions
// - Event listener on blockchain

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, amount, symbol, fromAddress, userId, usdValue } = body;

    if (!txHash || !amount || !symbol) {
      return NextResponse.json(
        { error: 'Missing required fields: txHash, amount, and symbol are required' },
        { status: 400 }
      );
    }

    // Check if already processed (prevent duplicates)
    if (await isTransactionProcessed(txHash)) {
      return NextResponse.json({
        success: true,
        message: 'Transaction already processed',
        txHash,
      });
    }

    // Find user by wallet address if userId not provided
    let targetUserId = userId;
    if (!targetUserId && fromAddress) {
      const supabase = createServerClient();
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', fromAddress.toLowerCase())
        .single();
      targetUserId = (user as any)?.id || null;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { 
          error: 'User not found. Please provide userId or ensure fromAddress matches a registered wallet address.',
          fromAddress 
        },
        { status: 404 }
      );
    }

    // Calculate USD value if not provided
    const calculatedUsdValue = usdValue || (amount * (TOKEN_PRICES[symbol] || 0));
    
    if (calculatedUsdValue <= 0) {
      return NextResponse.json(
        { error: 'Invalid USD value' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: targetUserId,
        type: 'deposit',
        tx_hash: txHash,
        from_address: fromAddress || null,
        to_address: process.env.TRUST_WALLET_ADDRESS || '0xbb2ced410523ec22fb7ee3008574efb7faefc6a5',
        amount: amount.toString(),
        symbol: symbol,
        usd_value: calculatedUsdValue,
        status: 'confirmed',
        network: 'BSC',
        created_at: now,
        confirmed_at: now,
      } as any);

    if (txError) {
      console.error('Error creating transaction record:', txError);
      // Continue processing even if transaction record fails
    }

    // Update user balance
    const newBalance = await updateUserBalance(targetUserId, calculatedUsdValue);
    
    // Mark as processed
    await markTransactionProcessed(txHash, targetUserId);

    return NextResponse.json({
      success: true,
      txHash,
      amount,
      symbol,
      usdValue: calculatedUsdValue,
      userId: targetUserId,
      newBalance,
      timestamp: now,
    });
  } catch (error) {
    console.error('Deposit processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process deposit', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { 
  isTransactionProcessed, 
  markTransactionProcessed,
  updateUserBalance 
} from '@/app/lib/supabaseBalanceStore';
import { TOKEN_PRICES } from '@/app/lib/tokenContracts';
import { createServerClient } from '@/app/lib/supabaseClient';

// Trust Wallet address - Master receiving address for all deposits
const TRUST_WALLET_ADDRESS = process.env.NEXT_PUBLIC_TRUST_WALLET_ADDRESS || process.env.TRUST_WALLET_ADDRESS || 'TLPLm1HZaBqG3cysDg321ebV9gfETxFcTy';

/**
 * Test Payment Endpoint for TRC-20
 * 
 * This endpoint allows you to simulate deposits for testing purposes.
 * In production, this should be disabled or protected with authentication.
 * 
 * Usage:
 * POST /api/deposits/test
 * {
 *   "userId": "user-id-here",
 *   "amount": 100,
 *   "symbol": "USDT",
 *   "fromAddress": "TYourWalletAddressHere...",
 *   "network": "TRON" // Optional, defaults to TRON
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // In production, you may want to restrict this endpoint
    // Only allow in development or with admin authentication
    const isDevelopment = process.env.NODE_ENV === 'development';
    const testModeEnabled = process.env.ENABLE_TEST_PAYMENTS === 'true';
    
    if (!isDevelopment && !testModeEnabled) {
      return NextResponse.json(
        { error: 'Test payment endpoint is disabled in production' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, amount, symbol, fromAddress, network = 'TRON', usdValue } = body;

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid amount. Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required field: symbol (e.g., USDT, USDC)' },
        { status: 400 }
      );
    }

    // Validate symbol for TRON
    const validSymbols = ['USDT', 'USDC', 'TRX'];
    if (!validSymbols.includes(symbol)) {
      return NextResponse.json(
        { error: `Invalid symbol. Supported symbols: ${validSymbols.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate network
    const validNetworks = ['TRON', 'BSC', 'ETH', 'BSC_TESTNET'];
    const depositNetwork = validNetworks.includes(network) ? network : 'TRON';

    // Verify user exists
    const supabase = createServerClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a test transaction hash (format: test_<timestamp>_<random>)
    const testTxHash = `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Check if already processed (shouldn't happen with test hashes, but safety check)
    if (await isTransactionProcessed(testTxHash)) {
      return NextResponse.json({
        success: true,
        message: 'Test transaction already processed',
        txHash: testTxHash,
      });
    }

    // Validate wallet address if provided
    let validatedFromAddress = fromAddress;
    if (fromAddress) {
      // For TRON, addresses start with T and are 34 characters
      if (depositNetwork === 'TRON') {
        if (!/^T[A-Za-z1-9]{33}$/.test(fromAddress)) {
          return NextResponse.json(
            { error: 'Invalid Tron wallet address format. Must start with T and be 34 characters.' },
            { status: 400 }
          );
        }
      }
      
      // Optionally verify that the address belongs to the user
      if (depositNetwork === 'TRON') {
        const { data: walletRecord } = await supabase
          .from('user_wallet_addresses')
          .select('user_id')
          .eq('wallet_address', fromAddress)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();
        
        if (!walletRecord) {
          // Also check users.wallet_address
          const { data: userRecord } = await supabase
            .from('users')
            .select('id')
            .eq('wallet_address', fromAddress)
            .eq('id', userId)
            .single();
          
          if (!userRecord) {
            return NextResponse.json(
              { 
                error: 'Wallet address does not belong to this user',
                hint: 'Register this wallet address in your account settings first'
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Calculate USD value if not provided
    const calculatedUsdValue = usdValue || (amount * (TOKEN_PRICES[symbol] || 0));
    
    if (calculatedUsdValue <= 0) {
      return NextResponse.json(
        { error: 'Invalid USD value' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        tx_hash: testTxHash,
        from_address: validatedFromAddress || null,
        to_address: TRUST_WALLET_ADDRESS,
        amount: amount.toString(),
        symbol: symbol,
        usd_value: calculatedUsdValue,
        status: 'confirmed',
        network: depositNetwork,
        created_at: now,
        confirmed_at: now,
      } as any);

    if (txError) {
      console.error('Error creating transaction record:', txError);
      return NextResponse.json(
        { error: 'Failed to create transaction record', details: txError.message },
        { status: 500 }
      );
    }

    // Update user balance
    const newBalance = await updateUserBalance(userId, calculatedUsdValue);
    
    // Mark as processed
    await markTransactionProcessed(testTxHash, userId);

    const userEmail = (user as any)?.email || null;

    return NextResponse.json({
      success: true,
      message: 'Test payment processed successfully',
      txHash: testTxHash,
      amount,
      symbol,
      usdValue: calculatedUsdValue,
      userId,
      userEmail,
      newBalance,
      network: depositNetwork,
      timestamp: now,
      note: 'This is a test transaction. In production, use real blockchain transactions.',
    });
  } catch (error) {
    console.error('Test payment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process test payment', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

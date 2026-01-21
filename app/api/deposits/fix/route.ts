import { NextRequest, NextResponse } from 'next/server';
import { 
  isTransactionProcessed, 
  markTransactionProcessed,
  updateUserBalance 
} from '@/app/lib/supabaseBalanceStore';
import { 
  TOKEN_CONTRACTS_TRON,
  TOKEN_PRICES,
  getTokenDecimals 
} from '@/app/lib/tokenContracts';
import { createServerClient } from '@/app/lib/supabaseClient';

const TRON_RPC_URL = process.env.RPC_URL || 'https://api.trongrid.io';

/**
 * Manual fix endpoint to process deposits for a specific address
 * POST /api/deposits/fix
 * 
 * Body: { depositAddress: "TWNHpaEhG74DzEBMDR6qxg1JiMDU62FGGT" }
 * 
 * This will:
 * 1. Find the user who owns this deposit address
 * 2. Check TronGrid for recent transactions
 * 3. Process any unprocessed deposits
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { depositAddress } = body;

    if (!depositAddress) {
      return NextResponse.json(
        { error: 'Missing depositAddress in request body' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find user who owns this deposit address
    const { data: walletRecord, error: walletError } = await supabase
      .from('user_wallet_addresses')
      .select('user_id, wallet_address')
      .eq('wallet_address', depositAddress)
      .eq('purpose', 'deposit')
      .eq('is_active', true)
      .single();

    if (walletError || !walletRecord) {
      return NextResponse.json(
        { 
          error: 'Deposit address not found in database',
          depositAddress,
          hint: 'Make sure this address is registered in user_wallet_addresses table'
        },
        { status: 404 }
      );
    }

    const userId = (walletRecord as any).user_id;

    // Fetch transactions from TronGrid
    const endpoint = `${TRON_RPC_URL}/v1/accounts/${depositAddress}/transactions/trc20?limit=50`;
    const response = await fetch(endpoint, {
      headers: { "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY || '' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: 'Failed to fetch transactions from TronGrid',
          status: response.status,
          details: errorText,
          hint: 'Check your TRON_PRO_API_KEY and RPC_URL environment variables'
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      return NextResponse.json(
        { 
          error: 'Invalid response from TronGrid',
          data: data 
        },
        { status: 500 }
      );
    }

    const processed: any[] = [];
    const skipped: any[] = [];
    const errors: any[] = [];

    // Process each transaction
    for (const tx of data.data) {
      const txHash = tx.transaction_id;
      const fromAddress = tx.from;
      const toAddress = tx.to;
      const tokenAddress = tx.token_info?.address;
      const tokenSymbol = tx.token_info?.symbol;
      const rawValue = tx.value;

      // Only process if it's TO the deposit address
      if (toAddress !== depositAddress) continue;

      // Only process supported tokens (USDT, USDC)
      const supportedTokens = Object.values(TOKEN_CONTRACTS_TRON);
      if (!supportedTokens.includes(tokenAddress)) {
        skipped.push({
          txHash,
          reason: `Unsupported token: ${tokenSymbol || tokenAddress}`
        });
        continue;
      }

      // Skip if already processed
      if (await isTransactionProcessed(txHash)) {
        skipped.push({
          txHash,
          reason: 'Already processed'
        });
        continue;
      }

      try {
        const decimals = getTokenDecimals('TRON', tokenSymbol);
        const amount = parseFloat(rawValue) / Math.pow(10, decimals);
        const usdValue = amount * (TOKEN_PRICES[tokenSymbol] || 1);

        // Mark as processed
        await markTransactionProcessed(txHash, userId);

        // Update user balance
        const newBalance = await updateUserBalance(userId, usdValue);

        // Create transaction record
        const now = new Date().toISOString();
        await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'deposit',
            tx_hash: txHash,
            from_address: fromAddress,
            to_address: depositAddress,
            amount: amount.toString(),
            symbol: tokenSymbol,
            usd_value: usdValue,
            status: 'confirmed',
            network: 'TRON',
            created_at: now,
            confirmed_at: now,
          } as any);

        processed.push({
          txHash,
          from: fromAddress,
          amount,
          symbol: tokenSymbol,
          usdValue,
          newBalance,
        });
      } catch (error) {
        errors.push({
          txHash,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      depositAddress,
      userId,
      summary: {
        totalTransactions: data.data.length,
        processed: processed.length,
        skipped: skipped.length,
        errors: errors.length,
      },
      processed,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Fix deposit error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix deposit', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


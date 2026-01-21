import { NextRequest, NextResponse } from 'next/server';
import { 
  isTransactionProcessed, 
  markTransactionProcessed,
  updateUserBalance 
} from '@/app/lib/supabaseBalanceStore';
import { 
  TOKEN_CONTRACTS_TRON,
  TOKEN_PRICES,
  getTokenSymbol,
  getTokenDecimals 
} from '@/app/lib/tokenContracts';
import { createServerClient } from '@/app/lib/supabaseClient';

// This route now supports per-user deposit addresses.
// For backward compatibility, if no user deposit addresses exist,
// it will still process the shared master address (if set).
const TRUST_WALLET_ADDRESS = process.env.NEXT_PUBLIC_TRUST_WALLET_ADDRESS || 'TLPLm1HZaBqG3cysDg321ebV9gfETxFcTy';

// Tron RPC URL
const TRON_RPC_URL = process.env.RPC_URL || 'https://api.trongrid.io';

interface Deposit {
  txHash: string;
  from: string;
  amount: number;
  symbol: string;
  usdValue: number;
  status: 'confirmed' | 'pending';
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const newDeposits: Deposit[] = [];

    // Fetch all active deposit addresses (per-user)
    const { data: depositAddresses } = await supabase
      .from('user_wallet_addresses')
      .select('user_id, wallet_address')
      .eq('purpose', 'deposit')
      .eq('is_active', true);

    // If none exist, fall back to the master address for backward compatibility
    const targets =
      depositAddresses && depositAddresses.length > 0
        ? depositAddresses.map((d: any) => ({ userId: d.user_id, address: d.wallet_address }))
        : [{ userId: null, address: TRUST_WALLET_ADDRESS }];

    // Helper: process transactions for a single address
    const processAddress = async (address: string, userId?: string | null) => {
      const endpoint = `${TRON_RPC_URL}/v1/accounts/${address}/transactions/trc20?limit=20`;
      const response = await fetch(endpoint, {
        headers: { "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY || '' }
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) return;

      for (const tx of data.data) {
        const txHash = tx.transaction_id;
        const fromAddress = tx.from;
        const toAddress = tx.to;
        const tokenAddress = tx.token_info?.address;
        const tokenSymbol = tx.token_info?.symbol;
        const rawValue = tx.value;

        // Only process if it's TO the target address
        if (toAddress !== address) continue;

        // Only process supported tokens (USDT, USDC)
        const supportedTokens = Object.values(TOKEN_CONTRACTS_TRON);
        if (!supportedTokens.includes(tokenAddress)) continue;

        // Skip if already processed
        if (await isTransactionProcessed(txHash)) continue;

        const decimals = getTokenDecimals('TRON', tokenSymbol);
        const amount = parseFloat(rawValue) / Math.pow(10, decimals);
        const usdValue = amount * (TOKEN_PRICES[tokenSymbol] || 1);

        // If userId was not provided (fallback case), try to find by sender
        let targetUserId = userId || null;
        if (!targetUserId) {
          const { data: walletRecord } = await supabase
            .from('user_wallet_addresses')
            .select('user_id')
            .eq('wallet_address', fromAddress)
            .eq('is_active', true)
            .single();
          targetUserId = (walletRecord as any)?.user_id || null;
        }

        // Mark as processed
        await markTransactionProcessed(txHash, targetUserId || undefined);

        newDeposits.push({
          txHash,
          from: fromAddress,
          amount,
          symbol: tokenSymbol,
          usdValue,
          status: 'confirmed',
          timestamp: new Date().toISOString(),
        });

        // Update user balance and create transaction record if user found
        if (targetUserId) {
          await updateUserBalance(targetUserId, usdValue);

          const now = new Date().toISOString();
          await supabase
            .from('transactions')
            .insert({
              user_id: targetUserId,
              type: 'deposit',
              tx_hash: txHash,
              from_address: fromAddress,
              to_address: address,
              amount: amount.toString(),
              symbol: tokenSymbol,
              usd_value: usdValue,
              status: 'confirmed',
              network: 'TRON',
              created_at: now,
              confirmed_at: now,
            } as any);
        }
      }
    };

    // Process each target address sequentially to avoid API rate issues
    for (const target of targets) {
      await processAddress(target.address, target.userId);
    }

    return NextResponse.json({
      success: true,
      newDeposits,
      processedCount: newDeposits.length,
    });
  } catch (error) {
    console.error('Deposit check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check deposits', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


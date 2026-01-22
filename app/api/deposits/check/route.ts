import { NextRequest, NextResponse } from 'next/server';
import { 
  isTransactionProcessed, 
  markTransactionProcessed,
  updateUserBalance,
  getUserBalance 
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

export async function POST(_request: NextRequest) {
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
    // Uses the same pattern as sync-balance: public account API (no API key needed)
    const processAddress = async (address: string, userId?: string | null) => {
      if (!userId) return; // Skip if no user ID
      
      // Use public account endpoint (same pattern as sync-balance) - no API key needed
      try {
        const accountEndpoint = `${TRON_RPC_URL}/v1/accounts/${address}`;
        const accountResponse = await fetch(accountEndpoint);
        
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          
          if (accountData.data && accountData.data.length > 0) {
            const account = accountData.data[0];

            console.log('Account:', account);
            
            // Extract TRC20 balances from account data (same as sync-balance)
            // Format: {"TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t":"2600000"}
            if (account.trc20 && Array.isArray(account.trc20) && account.trc20.length > 0) {
              const trc20Balances = account.trc20[0];

              console.log('TRC20 Balances:', trc20Balances);
              
              // Process each token balance
              for (const [contractAddress, balanceStr] of Object.entries(trc20Balances)) {
                // Only process supported tokens
                // Convert to string array to avoid strict literal type checking
                const supportedTokens: string[] = Object.values(TOKEN_CONTRACTS_TRON) as string[];
                const contractAddrStr = String(contractAddress);
                if (supportedTokens.includes(contractAddrStr)) {
                  // Get symbol from contract address
                  const symbol = Object.entries(TOKEN_CONTRACTS_TRON).find(
                    ([_, addr]) => addr === contractAddrStr
                  )?.[0] || 'UNKNOWN';
                  
                  const decimals = getTokenDecimals('TRON', symbol as 'USDT' | 'USDC');
                  const balance = parseFloat(balanceStr as string);
                  const amount = balance / Math.pow(10, decimals);

                  console.log('Balance:', balance);
                  console.log('Amount:', amount);
                  
                  if (amount > 0) {
                    const currentBalance = await getUserBalance(userId);
                    
                    // If on-chain balance is greater than account balance, sync it
                    if (amount > currentBalance + 0.01) {
                      const diff = amount - currentBalance;
                      const syncHash = `auto_sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                      
                      if (!(await isTransactionProcessed(syncHash))) {
                        await markTransactionProcessed(syncHash, userId);
                        await updateUserBalance(userId, diff);
                        
                        const now = new Date().toISOString();
                        await supabase.from('transactions').insert({
                          user_id: userId,
                          type: 'deposit',
                          tx_hash: syncHash,
                          to_address: address,
                          amount: diff.toFixed(8),
                          symbol,
                          usd_value: diff * (TOKEN_PRICES[symbol] || 1),
                          status: 'confirmed',
                          network: 'TRON',
                          created_at: now,
                          confirmed_at: now,
                        } as any);
                        
                        newDeposits.push({
                          txHash: syncHash,
                          from: 'blockchain_sync',
                          amount: diff,
                          symbol,
                          usdValue: diff * (TOKEN_PRICES[symbol] || 1),
                          status: 'confirmed',
                          timestamp: now,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Account balance check failed for ${address}:`, error);
      }

      // Optional: Try TronGrid transactions API (if API key exists) - for transaction history
      // This is optional and only used if you want to track individual transactions
      // The primary balance sync method above is sufficient for most use cases
      if (process.env.TRON_PRO_API_KEY) {
        try {
          const endpoint = `${TRON_RPC_URL}/v1/accounts/${address}/transactions/trc20?limit=20`;
          const response = await fetch(endpoint, {
            headers: { "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY }
          });

          if (response.ok) {
            const txData = await response.json();
            if (txData.data && Array.isArray(txData.data)) {
              for (const tx of txData.data) {
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


                console.log('Amount:', amount);
                console.log('USD Value:', usdValue);

                // Mark as processed
                await markTransactionProcessed(txHash, userId || undefined);

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
                if (userId) {
                  await updateUserBalance(userId, usdValue);

                  const now = new Date().toISOString();
                  await supabase
                    .from('transactions')
                    .insert({
                      user_id: userId,
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
            }
          }
        } catch (error) {
          // Silently fail - primary method doesn't need this
          console.warn(`TronGrid transactions API failed for ${address}:`, error);
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


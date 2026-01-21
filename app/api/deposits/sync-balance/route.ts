import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabaseClient';
import { getUserBalance, setUserBalance, updateUserBalance } from '@/app/lib/supabaseBalanceStore';
import { TOKEN_CONTRACTS_TRON, TOKEN_PRICES } from '@/app/lib/tokenContracts';

const TRON_RPC_URL = process.env.RPC_URL || 'https://api.trongrid.io';

/**
 * Sync on-chain balance with account balance
 * POST /api/deposits/sync-balance
 * 
 * Body: { depositAddress: "TWNHpaEhG74DzEBMDR6qxg1JiMDU62FGGT" }
 * 
 * This will:
 * 1. Fetch actual TRC-20 token balances from TronGrid
 * 2. Find the user who owns this deposit address
 * 3. Calculate total USD value of tokens
 * 4. Update user's account balance to match on-chain balance
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

    // Fetch TRC20 token balances - try multiple methods with detailed logging
    let trc20Tokens: any[] = [];
    const debugInfo: any[] = [];

    try {
      // Method 1: Direct TronWeb contract queries (most reliable)
      const { TronWeb } = await import('tronweb');
      const tronWeb = new TronWeb({
        fullHost: TRON_RPC_URL,
      });

      const supportedTokens = Object.entries(TOKEN_CONTRACTS_TRON);
      for (const [symbol, contractAddress] of supportedTokens) {
        try {
          debugInfo.push({ method: 'TronWeb', symbol, contractAddress, status: 'trying' });
          
          const contract = await tronWeb.contract().at(contractAddress);
          const balance = await contract.balanceOf(depositAddress).call();
          const decimals = await contract.decimals().call();
          
          const balanceStr = balance ? balance.toString() : '0';
          const decimalsNum = decimals ? parseInt(decimals.toString()) : 6;
          
          debugInfo.push({ 
            method: 'TronWeb', 
            symbol, 
            rawBalance: balanceStr, 
            decimals: decimalsNum,
            status: balanceStr !== '0' ? 'found' : 'zero'
          });
          
          if (balanceStr && balanceStr !== '0') {
            trc20Tokens.push({
              token_address: contractAddress,
              balance: balanceStr,
              token_info: {
                symbol: symbol,
                decimals: decimalsNum.toString(),
              }
            });
          }
        } catch (error) {
          debugInfo.push({ 
            method: 'TronWeb', 
            symbol, 
            error: error instanceof Error ? error.message : 'Unknown error',
            status: 'failed'
          });
          console.warn(`Failed to query ${symbol} via TronWeb:`, error);
        }
      }

      // Method 2: Try TronGrid API (if TronWeb didn't find anything and we have API key)
      if (trc20Tokens.length === 0 && process.env.TRON_PRO_API_KEY) {
        try {
          debugInfo.push({ method: 'TronGrid', status: 'trying' });
          const endpoint = `${TRON_RPC_URL}/v1/accounts/${depositAddress}/trc20`;
          const response = await fetch(endpoint, {
            headers: { "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY }
          });

          if (response.ok) {
            const data = await response.json();
            debugInfo.push({ method: 'TronGrid', responseData: data });
            trc20Tokens = data.data || [];
          } else {
            debugInfo.push({ method: 'TronGrid', status: response.status, statusText: response.statusText });
          }
        } catch (error) {
          debugInfo.push({ method: 'TronGrid', error: error instanceof Error ? error.message : 'Unknown' });
        }
      }

      // Method 3: Try TronScan public API
      if (trc20Tokens.length === 0) {
        try {
          debugInfo.push({ method: 'TronScan', status: 'trying' });
          const tronscanEndpoint = `https://apilist.tronscanapi.com/api/account/tokens?address=${depositAddress}&start=0&limit=20`;
          const tronscanResponse = await fetch(tronscanEndpoint);
          
          if (tronscanResponse.ok) {
            const tronscanData = await tronscanResponse.json();
            debugInfo.push({ method: 'TronScan', responseData: tronscanData });
            
            if (tronscanData.data && Array.isArray(tronscanData.data)) {
              trc20Tokens = tronscanData.data
                .filter((token: any) => {
                  // Only include USDT and USDC
                  const symbol = token.tokenAbbr?.toUpperCase();
                  return symbol === 'USDT' || symbol === 'USDC';
                })
                .map((token: any) => ({
                  token_address: token.tokenAddress,
                  balance: token.balance?.toString() || '0',
                  token_info: {
                    symbol: token.tokenAbbr?.toUpperCase() || 'UNKNOWN',
                    decimals: token.tokenDecimal?.toString() || '6',
                    name: token.tokenName,
                  }
                }));
            }
          } else {
            debugInfo.push({ method: 'TronScan', status: tronscanResponse.status });
          }
        } catch (error) {
          debugInfo.push({ method: 'TronScan', error: error instanceof Error ? error.message : 'Unknown' });
        }
      }
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch balances',
          details: error instanceof Error ? error.message : 'Unknown error',
          debugInfo,
          hint: 'Check your RPC_URL and network connection'
        },
        { status: 500 }
      );
    }

    // Calculate total USD value from supported tokens
    let totalUsdValue = 0;
    const tokenBalances: any[] = [];

    for (const token of trc20Tokens) {
      const tokenAddress = token.token_address;
      const tokenSymbol = token.token_info?.symbol || token.token_info?.name;
      const balance = parseFloat(token.balance || '0');
      const decimals = parseInt(token.token_info?.decimals || '6');

      // Only count supported tokens (USDT, USDC)
      const supportedTokens = Object.values(TOKEN_CONTRACTS_TRON);
      if (!supportedTokens.includes(tokenAddress)) continue;

      // Convert to human-readable amount
      const amount = balance / Math.pow(10, decimals);
      const usdValue = amount * (TOKEN_PRICES[tokenSymbol] || 1);

      totalUsdValue += usdValue;

      tokenBalances.push({
        symbol: tokenSymbol,
        contract: tokenAddress,
        amount,
        usdValue,
        balance: balance.toString(),
        decimals,
      });
    }

    // Get current account balance
    const currentAccountBalance = await getUserBalance(userId);

    // Calculate difference
    const difference = totalUsdValue - currentAccountBalance;

    // Update account balance to match on-chain balance
    if (Math.abs(difference) > 0.01) { // Only update if difference is significant (> 1 cent)
      await setUserBalance(userId, totalUsdValue);

      // If there's a positive difference, create a transaction record for the sync
      if (difference > 0) {
        const now = new Date().toISOString();
        await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'deposit',
            tx_hash: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
            from_address: null,
            to_address: depositAddress,
            amount: difference.toFixed(8),
            symbol: 'USD',
            usd_value: difference,
            status: 'confirmed',
            network: 'TRON',
            created_at: now,
            confirmed_at: now,
          } as any);
      }
    }

    return NextResponse.json({
      success: true,
      depositAddress,
      userId,
      onChainBalances: tokenBalances,
      totalOnChainUsd: parseFloat(totalUsdValue.toFixed(2)),
      previousAccountBalance: parseFloat(currentAccountBalance.toFixed(2)),
      newAccountBalance: parseFloat(totalUsdValue.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
      synced: Math.abs(difference) > 0.01,
      debug: {
        rawTokensFound: trc20Tokens.length,
        debugInfo,
        supportedTokens: Object.keys(TOKEN_CONTRACTS_TRON),
      },
    });
  } catch (error) {
    console.error('Sync balance error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync balance', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


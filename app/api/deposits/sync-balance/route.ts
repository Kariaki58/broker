import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabaseClient';
import { getUserBalance, setUserBalance, updateUserBalance } from '@/app/lib/supabaseBalanceStore';
import { TOKEN_CONTRACTS_TRON, TOKEN_PRICES, getTokenDecimals } from '@/app/lib/tokenContracts';

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

    // Fetch TRC20 token balances using public TronGrid account endpoint (no API key needed!)
    let trc20Tokens: any[] = [];
    const debugInfo: any[] = [];

    try {
      // Method 1: Use public TronGrid account endpoint (no authentication required)
      // This endpoint returns account info including TRC20 balances
      const accountEndpoint = `${TRON_RPC_URL}/v1/accounts/${depositAddress}`;
      debugInfo.push({ method: 'TronGrid Account API', endpoint: accountEndpoint, status: 'trying' });
      
      const accountResponse = await fetch(accountEndpoint);
      
      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        debugInfo.push({ method: 'TronGrid Account API', success: true, hasData: !!accountData.data });
        
        if (accountData.data && accountData.data.length > 0) {
          const account = accountData.data[0];
          
          // Extract TRC20 balances from the account data
          // Format: {"TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t":"2600000"}
          if (account.trc20 && Array.isArray(account.trc20) && account.trc20.length > 0) {
            const trc20Balances = account.trc20[0]; // First element contains the balances object
            
            // Convert to array format
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
                
                const decimals = getTokenDecimals('TRON', symbol);
                const balance = parseFloat(balanceStr as string);
                
                trc20Tokens.push({
                  token_address: contractAddress,
                  balance: balance.toString(),
                  token_info: {
                    symbol: symbol,
                    decimals: decimals.toString(),
                  }
                });
                
                debugInfo.push({ 
                  method: 'TronGrid Account API', 
                  symbol, 
                  contractAddress,
                  rawBalance: balance,
                  decimals,
                  status: 'found'
                });
              }
            }
          }
        }
      } else {
        debugInfo.push({ 
          method: 'TronGrid Account API', 
          status: accountResponse.status, 
          statusText: accountResponse.statusText 
        });
      }

      // Method 2: Fallback to TronWeb direct contract queries if account API didn't work
      if (trc20Tokens.length === 0) {
        try {
          const { TronWeb } = await import('tronweb');
          const tronWeb = new TronWeb({
            fullHost: TRON_RPC_URL,
          });

          const supportedTokens = Object.entries(TOKEN_CONTRACTS_TRON);
          for (const [symbol, contractAddress] of supportedTokens) {
            try {
              debugInfo.push({ method: 'TronWeb Fallback', symbol, contractAddress, status: 'trying' });
              
              const contract = await tronWeb.contract().at(contractAddress);
              const balance = await contract.balanceOf(depositAddress).call();
              const decimals = await contract.decimals().call();
              
              const balanceStr = balance ? balance.toString() : '0';
              const decimalsNum = decimals ? parseInt(decimals.toString()) : 6;
              
              if (balanceStr && balanceStr !== '0') {
                trc20Tokens.push({
                  token_address: contractAddress,
                  balance: balanceStr,
                  token_info: {
                    symbol: symbol,
                    decimals: decimalsNum.toString(),
                  }
                });
                debugInfo.push({ method: 'TronWeb Fallback', symbol, status: 'found' });
              }
            } catch (error) {
              debugInfo.push({ method: 'TronWeb Fallback', symbol, status: 'failed' });
            }
          }
        } catch (error) {
          debugInfo.push({ method: 'TronWeb Fallback', status: 'error' });
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


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

    console.log("Processing deposit address:", depositAddress);

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
    console.log(`Found user ID: ${userId} for address: ${depositAddress}`);

    // Results tracking
    const processed: any[] = [];
    const skipped: any[] = [];
    const errors: any[] = [];
    let transactions: any[] = [];
    
    // Method 1: Try TronGrid API (if API key exists)
    if (process.env.TRON_PRO_API_KEY) {
      try {
        console.log("Method 1: Checking TronGrid API...");
        const endpoint = `${TRON_RPC_URL}/v1/accounts/${depositAddress}/transactions/trc20?limit=100&only_to=true`;
        const response = await fetch(endpoint, {
          headers: { 
            "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY,
            "accept": "application/json"
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`TronGrid API returned ${data.data?.length || 0} TRC20 transactions`);
          if (data.data && Array.isArray(data.data)) {
            transactions = data.data;
          }
        } else {
          console.warn(`TronGrid API failed with status: ${response.status}`);
        }
      } catch (error) {
        console.warn('TronGrid API failed, trying fallback:', error);
      }
    }

    // Method 2: Use TronScan API for transfers (with API key)
    if (transactions.length === 0 && process.env.TRONSCAN_API_KEY) {
      try {
        console.log("Method 2: Checking TronScan Transfers API...");
        const tronscanEndpoint = `https://apilist.tronscanapi.com/api/transfer?address=${depositAddress}&start=0&limit=100&type=trc20`;
        const tronscanResponse = await fetch(tronscanEndpoint, {
          headers: {
            'TRON-PRO-API-KEY': process.env.TRONSCAN_API_KEY,
            'accept': 'application/json'
          }
        });
        
        if (tronscanResponse.ok) {
          const tronscanData = await tronscanResponse.json();
          console.log(`TronScan transfers API returned ${tronscanData.data?.length || 0} transactions`);
          
          if (tronscanData.data && Array.isArray(tronscanData.data)) {
            const incomingTransfers = tronscanData.data.filter((tx: any) => 
              tx.to_address && tx.to_address.toLowerCase() === depositAddress.toLowerCase()
            );
            
            console.log(`Filtered ${incomingTransfers.length} incoming transfers`);
            
            transactions = incomingTransfers.map((tx: any) => ({
              transaction_id: tx.transactionHash || tx.hash,
              from: tx.from_address,
              to: tx.to_address,
              value: tx.amount || tx.quant,
              token_info: {
                address: tx.token_address || tx.contract_address,
                symbol: tx.token_name || tx.tokenAbbr,
                decimals: tx.token_decimal || 6
              },
              raw_data: tx
            }));
          }
        } else {
          console.warn(`TronScan transfers API failed with status: ${tronscanResponse.status}`);
        }
      } catch (error) {
        console.warn('TronScan transfers API failed:', error);
      }
    }

    // Method 3: Check current balance via TronScan tokens (with API key)
    if (process.env.TRONSCAN_API_KEY) {
      try {
        console.log("Method 3: Checking TronScan Tokens API...");
        const tokensEndpoint = `https://apilist.tronscanapi.com/api/account/tokens?address=${depositAddress}&start=0&limit=50`;
        const tokensResponse = await fetch(tokensEndpoint, {
          headers: {
            'TRON-PRO-API-KEY': process.env.TRONSCAN_API_KEY,
            'accept': 'application/json'
          }
        });

        if (tokensResponse.ok) {
          const tokensData = await tokensResponse.json();
          console.log("TronScan tokens API response keys:", Object.keys(tokensData));
          
          const tokenList: any[] = (tokensData && Array.isArray(tokensData.data)) ? tokensData.data : [];
          console.log(`Found ${tokenList.length} tokens for address`);
          
          // Log all tokens for debugging
          tokenList.forEach((token, index) => {
            console.log(`Token ${index + 1}:`, {
              symbol: token.tokenAbbr,
              balance: token.balance,
              decimals: token.tokenDecimal,
              name: token.tokenName,
              tokenId: token.tokenId
            });
          });

          // Check each supported token
          const supportedTokens = ['USDT', 'USDC', 'TRX'];
          for (const tokenSymbol of supportedTokens) {
            const token = tokenList.find(t => 
              (t.tokenAbbr || '').toUpperCase() === tokenSymbol || 
              (t.tokenName || '').toUpperCase() === tokenSymbol
            );
            
            if (token) {
              console.log(`Processing ${tokenSymbol} token:`, token);
              
              const decimals = parseInt(token.tokenDecimal?.toString() || 
                (tokenSymbol === 'USDT' || tokenSymbol === 'USDC' ? '6' : '6'));
              
              const rawBalance = parseFloat(token.balance || '0');
              const amount = rawBalance / Math.pow(10, decimals);
              
              console.log(`${tokenSymbol} balance: ${amount} (raw: ${rawBalance}, decimals: ${decimals})`);
              
              if (amount > 0) {
                const currentAccountBalance = await getUserBalance(userId);
                console.log(`Current account balance: ${currentAccountBalance}`);
                
                const tokenPrice = TOKEN_PRICES[tokenSymbol] || 
                  (tokenSymbol === 'USDT' || tokenSymbol === 'USDC' ? 1 : 0.14);
                const usdValue = amount * tokenPrice;
                
                console.log(`${tokenSymbol} USD value: ${usdValue}`);
                
                // If the token balance in USD is significantly higher than current balance
                if (usdValue > currentAccountBalance + 0.01) {
                  const difference = usdValue - currentAccountBalance;
                  const syncTxHash = `sync_${tokenSymbol.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                  
                  console.log(`Found discrepancy: ${difference} USD. Updating balance...`);
                  
                  await updateUserBalance(userId, difference);
                  await markTransactionProcessed(syncTxHash, userId);
                  
                  const now = new Date().toISOString();
                  await supabase.from('transactions').insert({
                    user_id: userId,
                    type: 'deposit',
                    tx_hash: syncTxHash,
                    to_address: depositAddress,
                    amount: amount.toFixed(8),
                    symbol: tokenSymbol,
                    usd_value: usdValue,
                    status: 'confirmed',
                    network: 'TRON',
                    created_at: now,
                    confirmed_at: now,
                  } as any);

                  processed.push({
                    txHash: syncTxHash,
                    amount: amount,
                    symbol: tokenSymbol,
                    usdValue: usdValue,
                    method: 'tronscan_token_sync',
                    previousBalance: currentAccountBalance,
                    newBalance: currentAccountBalance + difference
                  });
                } else {
                  console.log(`No discrepancy found for ${tokenSymbol}`);
                  skipped.push({
                    symbol: tokenSymbol,
                    amount: amount,
                    reason: 'Balance already accounted for'
                  });
                }
              }
            } else {
              console.log(`${tokenSymbol} not found in token list`);
            }
          }
        } else {
          console.warn(`TronScan tokens API failed with status: ${tokensResponse.status}`);
        }
      } catch (error) {
        console.warn('TronScan tokens API failed:', error);
      }
    }

    // Method 4: Check native TRX balance via direct blockchain query
    try {
      console.log("Method 4: Checking native TRX balance...");
      const { TronWeb } = await import('tronweb');
      const tronWeb = new TronWeb({ fullHost: TRON_RPC_URL });
      
      // Check TRX balance
      const trxBalance = await tronWeb.trx.getBalance(depositAddress);
      const trxAmount = trxBalance / 1_000_000; // 6 decimals
      
      console.log(`Direct TRX balance check: ${trxAmount} TRX`);
      
      if (trxAmount > 0) {
        const currentAccountBalance = await getUserBalance(userId);
        const trxPrice = TOKEN_PRICES['TRX'] || 0.14;
        const trxUSDValue = trxAmount * trxPrice;
        
        console.log(`TRX USD value: ${trxUSDValue}, Current balance: ${currentAccountBalance}`);
        
        // Check if we need to add TRX balance
        if (trxUSDValue > currentAccountBalance + 0.01) {
          const difference = trxUSDValue - currentAccountBalance;
          const syncTxHash = `sync_trx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          console.log(`Adding TRX balance difference: ${difference} USD`);
          
          await updateUserBalance(userId, difference);
          await markTransactionProcessed(syncTxHash, userId);
          
          const now = new Date().toISOString();
          await supabase.from('transactions').insert({
            user_id: userId,
            type: 'deposit',
            tx_hash: syncTxHash,
            to_address: depositAddress,
            amount: trxAmount.toFixed(6),
            symbol: 'TRX',
            usd_value: trxUSDValue,
            status: 'confirmed',
            network: 'TRON',
            created_at: now,
            confirmed_at: now,
          } as any);

          processed.push({
            txHash: syncTxHash,
            amount: trxAmount,
            symbol: 'TRX',
            usdValue: trxUSDValue,
            method: 'direct_trx_query',
            previousBalance: currentAccountBalance,
            newBalance: currentAccountBalance + difference
          });
        } else {
          console.log('TRX balance already accounted for');
        }
        
        // Also check TRX transactions
        try {
          // getTransactionsRelated signature: (address, direction, limit)
          // limit is a number, not an object
          const trxTransactions = await tronWeb.trx.getTransactionsRelated(
            depositAddress,
            'to',
            20 // limit as number
          );
          
          console.log(`Found ${trxTransactions.length} TRX transactions`);
          
          for (const tx of trxTransactions) {
            const txHash = tx.txID;
            
            if (await isTransactionProcessed(txHash)) {
              console.log(`TRX transaction ${txHash} already processed`);
              continue;
            }
            
            // Type-safe access to transaction amount
            // For TransferContract, the value has amount and owner_address
            const contractParam = tx.raw_data?.contract?.[0]?.parameter?.value as any;
            const amount = contractParam?.amount || 0;
            const ownerAddress = contractParam?.owner_address || '';
            
            // Only process if this is a transfer TO the deposit address
            const toAddress = contractParam?.to_address || '';
            if (toAddress !== depositAddress) {
              console.log(`Skipping TRX transaction ${txHash} - not to target address`);
              continue;
            }
            
            const trxAmount = amount / 1_000_000;
            const usdValue = trxAmount * trxPrice;
            
            console.log(`Processing TRX transaction ${txHash}: ${trxAmount} TRX`);
            
            await markTransactionProcessed(txHash, userId);
            await updateUserBalance(userId, usdValue);
            
            const now = new Date().toISOString();
            await supabase.from('transactions').insert({
              user_id: userId,
              type: 'deposit',
              tx_hash: txHash,
              from_address: ownerAddress,
              to_address: depositAddress,
              amount: trxAmount.toFixed(6),
              symbol: 'TRX',
              usd_value: usdValue,
              status: 'confirmed',
              network: 'TRON',
              created_at: now,
              confirmed_at: now,
            } as any);

            processed.push({
              txHash: txHash,
              from: ownerAddress,
              amount: trxAmount,
              symbol: 'TRX',
              usdValue: usdValue,
              method: 'trx_transaction'
            });
          }
        } catch (txError) {
          console.warn('Failed to get TRX transactions:', txError);
        }
      }
    } catch (error) {
      console.warn('Direct TRX query failed:', error);
    }

    // Method 5: Direct TRC20 token balance queries
    try {
      console.log("Method 5: Checking direct TRC20 balances...");
      const { TronWeb } = await import('tronweb');
      const tronWeb = new TronWeb({ fullHost: TRON_RPC_URL });
      
      const supportedTokens = Object.entries(TOKEN_CONTRACTS_TRON);
      
      for (const [symbol, contractAddress] of supportedTokens) {
        // Skip TRX as we already handled it
        if (symbol === 'TRX') continue;
        
        try {
          console.log(`Checking ${symbol} at ${contractAddress}...`);
          const contract = await tronWeb.contract().at(contractAddress);
          const balance = await contract.balanceOf(depositAddress).call();
          
          // Handle different decimal formats
          let decimals;
          try {
            const decimalsResult = await contract.decimals().call();
            decimals = typeof decimalsResult === 'object' ? 
              Number(decimalsResult.toString()) : 
              Number(decimalsResult);
          } catch {
            // Default decimals for common tokens
            decimals = symbol === 'USDT' || symbol === 'USDC' ? 6 : 18;
          }
          
          const amount = Number(balance) / Math.pow(10, decimals);
          
          console.log(`${symbol} direct balance: ${amount} (decimals: ${decimals})`);
          
          if (amount > 0) {
            const currentAccountBalance = await getUserBalance(userId);
            const tokenPrice = TOKEN_PRICES[symbol] || 1;
            const usdValue = amount * tokenPrice;
            
            // Check if this specific token amount needs to be added
            const tokenAlreadyProcessed = processed.some(p => p.symbol === symbol && Math.abs(p.amount - amount) < 0.000001);
            
            if (!tokenAlreadyProcessed && usdValue > 0.01) {
              const syncTxHash = `direct_${symbol.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              
              console.log(`Adding ${symbol} balance: ${amount} (${usdValue} USD)`);
              
              await updateUserBalance(userId, usdValue);
              await markTransactionProcessed(syncTxHash, userId);
              
              const now = new Date().toISOString();
              await supabase.from('transactions').insert({
                user_id: userId,
                type: 'deposit',
                tx_hash: syncTxHash,
                to_address: depositAddress,
                amount: amount.toFixed(8),
                symbol,
                usd_value: usdValue,
                status: 'confirmed',
                network: 'TRON',
                created_at: now,
                confirmed_at: now,
              } as any);

              processed.push({
                txHash: syncTxHash,
                amount: amount,
                symbol,
                usdValue: usdValue,
                method: 'direct_contract_query',
                contractAddress
              });
            }
          }
        } catch (e) {
          console.warn(`Direct balance check failed for ${symbol}:`, e);
        }
      }
    } catch (error) {
      console.warn('Direct blockchain query Method 5 failed:', error);
    }

    // Process transactions from history methods (1 & 2)
    if (transactions.length > 0) {
      console.log(`Processing ${transactions.length} transactions from API history...`);
      
      for (const tx of transactions) {
        const txHash = tx.transaction_id;
        const fromAddress = tx.from;
        const toAddress = tx.to;
        const tokenAddress = tx.token_info?.address;
        const tokenSymbol = tx.token_info?.symbol || 'UNKNOWN';
        const rawValue = tx.value;

        if (toAddress.toLowerCase() !== depositAddress.toLowerCase()) {
          console.log(`Skipping transaction ${txHash} - not to target address`);
          continue;
        }

        const supportedTokens = Object.values(TOKEN_CONTRACTS_TRON);
        if (!supportedTokens.includes(tokenAddress) && tokenAddress !== 'TRX_NATIVE') {
          console.log(`Skipping transaction ${txHash} - unsupported token: ${tokenSymbol}`);
          skipped.push({ txHash, reason: `Unsupported token: ${tokenSymbol || tokenAddress}` });
          continue;
        }

        if (await isTransactionProcessed(txHash)) {
          console.log(`Skipping transaction ${txHash} - already processed`);
          skipped.push({ txHash, reason: 'Already processed' });
          continue;
        }

        try {
          const decimals = tokenSymbol === 'TRX' ? 6 : 
            (tx.token_info?.decimals || getTokenDecimals('TRON', tokenSymbol));
          
          const amount = parseFloat(rawValue) / Math.pow(10, decimals);
          const usdValue = amount * (TOKEN_PRICES[tokenSymbol] || 1);

          console.log(`Processing transaction ${txHash}: ${amount} ${tokenSymbol} (${usdValue} USD)`);

          await markTransactionProcessed(txHash, userId);
          const newBalance = await updateUserBalance(userId, usdValue);

          const now = new Date().toISOString();
          await supabase.from('transactions').insert({
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
            method: 'api_history'
          });
        } catch (error) {
          console.error(`Error processing transaction ${txHash}:`, error);
          errors.push({
            txHash,
            error: error instanceof Error ? error.message : 'Unknown error',
            rawTx: tx
          });
        }
      }
    }

    // Final summary
    if (processed.length === 0 && skipped.length === 0 && errors.length === 0) {
      console.log('No transactions found or already processed');
      return NextResponse.json(
        { 
          error: 'No transactions found or already processed',
          depositAddress,
          userId,
          hint: 'The account might have no balance, or all transactions are already synced'
        },
        { status: 404 }
      );
    }

    console.log(`Fix completed. Processed: ${processed.length}, Skipped: ${skipped.length}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      depositAddress,
      userId,
      summary: {
        totalFound: transactions.length,
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
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
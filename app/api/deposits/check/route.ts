import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  isTransactionProcessed, 
  markTransactionProcessed,
  updateUserBalance 
} from '@/app/lib/supabaseBalanceStore';
import { 
  TOKEN_CONTRACTS, 
  TRANSFER_EVENT_SIGNATURE,
  TOKEN_PRICES,
  getTokenSymbol,
  getTokenDecimals 
} from '@/app/lib/tokenContracts';
import { createServerClient } from '@/app/lib/supabaseClient';

// Trust Wallet address - Master receiving address for all deposits (BNB, USDT, USDC)
const TRUST_WALLET_ADDRESS = process.env.TRUST_WALLET_ADDRESS || '0xbb2ced410523ec22fb7ee3008574efb7faefc6a5';

// BSC RPC URLs - supports BNB, USDT, USDC on Binance Smart Chain
// Use fallback URLs for better reliability
// Only use BSC-specific RPC URLs (ignore generic RPC_URL which might be ETH)
const BSC_RPC_URLS = [
  process.env.BSC_RPC_URL, // Explicit BSC RPC from env
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  'https://bsc-dataseed.binance.org',
  'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3', // Public NodeReal endpoint
].filter(Boolean) as string[];

interface Deposit {
  txHash: string;
  from: string;
  amount: number;
  symbol: string;
  usdValue: number;
  status: 'confirmed' | 'pending';
  timestamp: string;
}

// Helper function to create provider with retry logic
async function createProvider(): Promise<ethers.JsonRpcProvider> {
  let lastError: Error | null = null;
  
  for (const rpcUrl of BSC_RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl, {
        name: 'bsc',
        chainId: 56,
      });
      
      // Test connection by getting network info
      await provider.getNetwork();
      return provider;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Failed to connect to RPC ${rpcUrl}:`, lastError.message);
      continue;
    }
  }
  
  throw new Error(`Failed to connect to any BSC RPC endpoint. Last error: ${lastError?.message || 'Unknown error'}`);
}

export async function POST(request: NextRequest) {
  try {
    const provider = await createProvider();
    const newDeposits: Deposit[] = [];

    // Check the last 10 blocks for deposits (reduced for better performance)
    // In production, use a smaller number and run more frequently
    const currentBlock = await provider.getBlockNumber();
    const blocksToCheck = 10;

    // Helper function to find user by their sending wallet address (FROM address)
    // Checks both users.wallet_address and user_wallet_addresses table
    const findUserByWalletAddress = async (walletAddress: string): Promise<string | null> => {
      const supabase = createServerClient();
      const addressLower = walletAddress.toLowerCase();
      
      // First check user_wallet_addresses table (multiple addresses per user)
      const { data: walletRecord } = await supabase
        .from('user_wallet_addresses')
        .select('user_id')
        .eq('wallet_address', addressLower)
        .eq('is_active', true)
        .single();
      
      if (walletRecord) {
        return (walletRecord as any)?.user_id || null;
      }
      
      // Fallback to users.wallet_address (legacy support)
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', addressLower)
        .single();
      
      return (user as any)?.id || null;
    };

    // 1. Check for native BNB deposits (BSC native token)
    for (let i = 0; i < blocksToCheck; i++) {
      const blockNumber = currentBlock - i;
      try {
        const block = await provider.getBlock(blockNumber, true);

        if (block && block.transactions) {
          for (const tx of block.transactions) {
            // Type guard for transaction object
            if (typeof tx === 'object' && tx !== null && 'to' in tx && 'hash' in tx && 'value' in tx && 'from' in tx) {
              const txObj = tx as { to: string | null; hash: string; value: bigint; from: string };
              
              // Check if transaction is TO Trust Wallet address
              if (txObj.to && txObj.to.toLowerCase() === TRUST_WALLET_ADDRESS.toLowerCase()) {
                const txHash = txObj.hash;
                
                // Skip if already processed
                if (await isTransactionProcessed(txHash)) {
                  continue;
                }

                // Get transaction receipt to confirm it's successful
                try {
                  const receipt = await provider.getTransactionReceipt(txHash);
                  if (receipt && receipt.status === 1) {
                    const value = parseFloat(ethers.formatEther(txObj.value));
                    
                    // Only process if value > 0 (actual BNB transfer)
                    if (value > 0) {
                      const fromAddress = txObj.from;
                      const usdValue = value * (TOKEN_PRICES.BNB || 600);

                      // Find user by their sending wallet address (FROM address)
                      const userId = await findUserByWalletAddress(fromAddress);

                      // Mark as processed
                      await markTransactionProcessed(txHash, userId || undefined);

                      newDeposits.push({
                        txHash,
                        from: fromAddress,
                        amount: value,
                        symbol: 'BNB',
                        usdValue,
                        status: 'confirmed',
                        timestamp: new Date().toISOString(),
                      });

                      // Update user balance and create transaction record if user found
                      if (userId) {
                        await updateUserBalance(userId, usdValue);
                        
                        // Create transaction record
                        const supabase = createServerClient();
                        const now = new Date().toISOString();
                        await supabase
                          .from('transactions')
                          .insert({
                            user_id: userId,
                            type: 'deposit',
                            tx_hash: txHash,
                            from_address: fromAddress,
                            to_address: TRUST_WALLET_ADDRESS,
                            amount: value.toString(),
                            symbol: 'BNB',
                            usd_value: usdValue,
                            status: 'confirmed',
                            network: 'BSC',
                            created_at: now,
                            confirmed_at: now,
                          } as any);
                      }
                    }
                  }
                } catch (receiptError) {
                  console.error(`Error getting receipt for ${txHash}:`, receiptError);
                  continue;
                }
              }
            }
          }
        }
      } catch (blockError) {
        // Handle rate limiting and other RPC errors gracefully
        if (blockError instanceof Error) {
          if (blockError.message.includes('rate limit') || blockError.message.includes('429')) {
            console.warn(`Rate limit hit for block ${blockNumber}, will retry later`);
            // Return partial results if rate limited
            if (newDeposits.length > 0) {
              return NextResponse.json({
                success: true,
                newDeposits,
                checkedBlocks: i + 1,
                processedCount: newDeposits.length,
                warning: 'Rate limited - partial results',
              });
            }
          } else {
            console.error(`Error processing block ${blockNumber}:`, blockError.message);
          }
        } else {
          console.error(`Error processing block ${blockNumber}:`, blockError);
        }
        // Continue with next block instead of failing completely
        continue;
      }
    }

    // 2. Check for BEP-20 token deposits (USDT, USDC on BSC)
    const tokenAddresses = Object.values(TOKEN_CONTRACTS);
    
    for (const tokenAddress of tokenAddresses) {
      try {
        // Add small delay between token checks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check recent blocks for Transfer events
        const fromBlock = Math.max(0, currentBlock - blocksToCheck);
        const toBlock = currentBlock;

        // Get Transfer events where 'to' is the Trust Wallet address
        // For indexed address parameters, pad to 32 bytes (64 hex chars)
        const trustWalletTopic = ethers.zeroPadValue(TRUST_WALLET_ADDRESS, 32);
        
        const logs = await provider.getLogs({
          address: tokenAddress,
          topics: [
            TRANSFER_EVENT_SIGNATURE,
            null, // from (any address)
            trustWalletTopic, // to (Trust Wallet) - indexed parameter
          ],
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const txHash = log.transactionHash;
          
          // Skip if already processed
          if (await isTransactionProcessed(txHash)) {
            continue;
          }

          try {
            // Get transaction receipt to confirm it's successful
            const receipt = await provider.getTransactionReceipt(txHash);
            if (receipt && receipt.status === 1) {
              // Decode the Transfer event
              const iface = new ethers.Interface([
                'event Transfer(address indexed from, address indexed to, uint256 value)',
              ]);
              
              const decodedLog = iface.parseLog({
                topics: log.topics,
                data: log.data,
              });

              if (decodedLog) {
                const fromAddress = decodedLog.args[0];
                const toAddress = decodedLog.args[1];
                const value = decodedLog.args[2];

                // Verify it's going to Trust Wallet
                if (toAddress.toLowerCase() === TRUST_WALLET_ADDRESS.toLowerCase()) {
                  const tokenSymbol = getTokenSymbol(tokenAddress);
                  if (tokenSymbol) {
                    const decimals = getTokenDecimals(tokenSymbol);
                    const amount = parseFloat(ethers.formatUnits(value, decimals));
                    const usdValue = amount * (TOKEN_PRICES[tokenSymbol] || 1);

                    // Find user by their sending wallet address (FROM address)
                    const userId = await findUserByWalletAddress(fromAddress);

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
                      
                      // Create transaction record
                      const supabase = createServerClient();
                      const now = new Date().toISOString();
                      await supabase
                        .from('transactions')
                        .insert({
                          user_id: userId,
                          type: 'deposit',
                          tx_hash: txHash,
                          from_address: fromAddress,
                            to_address: TRUST_WALLET_ADDRESS,
                          amount: amount.toString(),
                          symbol: tokenSymbol,
                          usd_value: usdValue,
                          status: 'confirmed',
                          network: 'BSC',
                          created_at: now,
                          confirmed_at: now,
                        } as any);
                    }
                  }
                }
              }
            }
          } catch (logError) {
            console.error(`Error processing log for ${txHash}:`, logError);
            continue;
          }
        }
      } catch (tokenError) {
        // Handle rate limiting and other RPC errors gracefully
        if (tokenError instanceof Error) {
          const errorMsg = tokenError.message.toLowerCase();
          if (errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('too many requests')) {
            console.warn(`Rate limit hit for token ${tokenAddress}, skipping for now`);
            // Add longer delay before next token check
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
            console.warn(`Network error for token ${tokenAddress}, will retry later`);
          } else {
            console.error(`Error checking token ${tokenAddress}:`, tokenError.message);
          }
        } else {
          console.error(`Error checking token ${tokenAddress}:`, tokenError);
        }
        // Continue with next token instead of failing completely
        continue;
      }
    }

    // Note: User balances are now updated automatically when deposits are found
    // The findUserByWalletAddress function matches deposits to users by their registered wallet address

    return NextResponse.json({
      success: true,
      newDeposits,
      checkedBlocks: blocksToCheck,
      processedCount: newDeposits.length,
    });
  } catch (error) {
    console.error('Deposit check error:', error);
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRpcError = errorMessage.includes('RPC') || errorMessage.includes('network') || errorMessage.includes('detect');
    
    return NextResponse.json(
      { 
        error: 'Failed to check deposits', 
        details: errorMessage,
        ...(isRpcError && {
          suggestion: 'Please check your BSC_RPC_URL environment variable. Ensure it points to a valid BSC RPC endpoint.',
          availableRPCs: BSC_RPC_URLS.slice(0, 3), // Show first 3 for reference
        }),
      },
      { status: 500 }
    );
  }
}

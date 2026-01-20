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

// Trust Wallet address - in production, get from environment variables
const TRUST_WALLET_ADDRESS = process.env.TRUST_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
const RPC_URL = process.env.RPC_URL || 'https://eth.llamarpc.com';

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
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const newDeposits: Deposit[] = [];

    // Check the last 20 blocks for deposits (increased for better coverage)
    const currentBlock = await provider.getBlockNumber();
    const blocksToCheck = 20;

    // 1. Check for native ETH deposits
    for (let i = 0; i < blocksToCheck; i++) {
      const blockNumber = currentBlock - i;
      try {
        const block = await provider.getBlock(blockNumber, true);

        if (block && block.transactions) {
          for (const tx of block.transactions) {
            // Type guard for transaction object
            if (typeof tx === 'object' && tx !== null && 'to' in tx && 'hash' in tx && 'value' in tx && 'from' in tx) {
              const txObj = tx as { to: string | null; hash: string; value: bigint; from: string };
              
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
                    
                    // Only process if value > 0 (actual ETH transfer)
                    if (value > 0) {
                      const fromAddress = txObj.from;
                      const usdValue = value * (TOKEN_PRICES.ETH || 2650);

                      // Mark as processed
                      await markTransactionProcessed(txHash);

                      newDeposits.push({
                        txHash,
                        from: fromAddress,
                        amount: value,
                        symbol: 'ETH',
                        usdValue,
                        status: 'confirmed',
                        timestamp: new Date().toISOString(),
                      });
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

    // 2. Check for ERC-20 token deposits (USDT, USDC)
    const tokenAddresses = Object.values(TOKEN_CONTRACTS);
    
    for (const tokenAddress of tokenAddresses) {
      try {
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

                // Verify it's going to our Trust Wallet
                if (toAddress.toLowerCase() === TRUST_WALLET_ADDRESS.toLowerCase()) {
                  const tokenSymbol = getTokenSymbol(tokenAddress);
                  if (tokenSymbol) {
                    const decimals = getTokenDecimals(tokenSymbol);
                    const amount = parseFloat(ethers.formatUnits(value, decimals));
                    const usdValue = amount * (TOKEN_PRICES[tokenSymbol] || 1);

                    // Mark as processed
                    await markTransactionProcessed(txHash);

                    newDeposits.push({
                      txHash,
                      from: fromAddress,
                      amount,
                      symbol: tokenSymbol,
                      usdValue,
                      status: 'confirmed',
                      timestamp: new Date().toISOString(),
                    });
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
          if (tokenError.message.includes('rate limit') || tokenError.message.includes('429')) {
            console.warn(`Rate limit hit for token ${tokenAddress}, will retry later`);
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

    // 3. Update user balances for new deposits (directly, no HTTP call)
    // In production, match deposits to actual users
    const userId = 'default-user'; // TODO: Implement user matching
    
    for (const deposit of newDeposits) {
      try {
        // Update balance directly using Supabase
        await updateUserBalance(userId, deposit.usdValue);
      } catch (error) {
        console.error(`Error updating balance for deposit ${deposit.txHash}:`, error);
        // Don't fail the entire request if one balance update fails
      }
    }

    return NextResponse.json({
      success: true,
      newDeposits,
      checkedBlocks: blocksToCheck,
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

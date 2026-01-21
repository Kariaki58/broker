import { NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { bscTestnet, mainnet } from 'viem/chains';
import { createServerClient } from '@/app/lib/supabaseClient';
import { updateUserBalance, markTransactionProcessed, isTransactionProcessed } from '@/app/lib/supabaseBalanceStore';
import { getTokenContract, getTokenDecimals } from '@/app/lib/tokenContracts';

// Ensure these are set in .env.local
const CENTRAL_WALLET = process.env.NEXT_PUBLIC_CENTRAL_WALLET_ADDRESS?.toLowerCase();
const RPC_URL_BSC = process.env.RPC_URL_BSC || 'https://data-seed-prebsc-1-s1.binance.org:8545';
const RPC_URL_ETH = process.env.RPC_URL_ETH || 'https://eth.llamarpc.com'; // Public fallback

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amount, txHash, senderAddress, symbol = 'BNB', network = 'BSC', simulate } = body;
    
    // Basic validation
    if (!txHash || !amount || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if already processed locally
    if (await isTransactionProcessed(txHash)) {
       return NextResponse.json({ verified: true, message: 'Already processed' });
    }

    // SIMULATION MODE (Testnet Only)
    // Allows testing the UI flow without waiting for blockchain
    if (simulate === true) {
      if (!txHash.startsWith('0x_SIMULATED_')) {
        return NextResponse.json({ verified: false, reason: 'Invalid simulation hash' });
      }
      
      // Proceed to mock success
      const now = new Date().toISOString();
      let usdPrice = 0;
      if (symbol === 'USDT' || symbol === 'USDC') usdPrice = 1;
      else if (symbol === 'BNB') usdPrice = 650;
      else if (symbol === 'ETH') usdPrice = 2650;
      
      const usdValue = parseFloat(amount) * usdPrice;
      
      const supabase = createServerClient();
      
      // Record Transaction
      await (supabase.from('transactions') as any).insert({
        user_id: userId,
        type: 'deposit',
        tx_hash: txHash,
        from_address: senderAddress || '0xSimulatedUser',
        to_address: CENTRAL_WALLET || '0xCentralWallet',
        amount: amount.toString(),
        symbol: symbol,
        usd_value: usdValue,
        status: 'confirmed',
        network: 'BSC_TESTNET_SIM', // Mark as simulation
        created_at: now,
        confirmed_at: now,
      });

      // Update Balance
      await updateUserBalance(userId, usdValue);
      await markTransactionProcessed(txHash, userId);

      return NextResponse.json({ verified: true, amount, txHash, message: 'Simulation successful' });
    }

    // Select Chain & Client
    let client;
    if (network === 'ETH') {
       client = createPublicClient({ chain: mainnet, transport: http(RPC_URL_ETH) });
    } else {
       client = createPublicClient({ chain: bscTestnet, transport: http(RPC_URL_BSC) });
    }

    // Verification Logic
    let verified = false;
    let actualAmount = '0';
    
    // 1. Fetch Transaction from Blockchain
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });

    // 2. Verify Status is Success
    if (receipt.status !== 'success') {
      return NextResponse.json({ verified: false, reason: 'Transaction failed on-chain' });
    }

    if (symbol === 'BNB' || symbol === 'ETH') {
      // --- Native Coin Verification ---
      
      // Verify Recipient
      if (tx.to?.toLowerCase() !== CENTRAL_WALLET) {
         return NextResponse.json({ verified: false, reason: 'Invalid recipient address' });
      }

      // Verify Amount
      const onChainAmount = formatUnits(tx.value, 18);
      
      if (Math.abs(parseFloat(onChainAmount) - parseFloat(amount)) > 0.0001) {
         return NextResponse.json({ 
           verified: false, 
           reason: 'Amount mismatch', 
           expected: amount, 
           received: onChainAmount 
         });
      }

      verified = true;
      actualAmount = onChainAmount;

    } else {
      // --- Token Verification (USDT, USDC) ---
      
      const tokenContract = getTokenContract(network, symbol);
      if (!tokenContract) {
        return NextResponse.json({ verified: false, reason: `Unsupported token symbol on ${network}` });
      }

      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // keccak256("Transfer(address,address,uint256)")
      // Verify Logs for Transfer Event to Our Wallet
      const transferLog = receipt.logs.find(log => {
        const isCorrectContract = log.address.toLowerCase() === tokenContract.toLowerCase();
        const isTransferEvent = log.topics[0] === transferEventSignature;
        
        // Topic 1 is From, Topic 2 is To (padded 32 bytes)
        // Check if Topic 2 matches our central wallet
        if (!log.topics[2]) return false;
        const toAddress = '0x' + log.topics[2].slice(26); // Last 20 bytes
        const isToOurWallet = toAddress.toLowerCase() === CENTRAL_WALLET;

        return isCorrectContract && isTransferEvent && isToOurWallet;
      });

      if (!transferLog) {
         return NextResponse.json({ verified: false, reason: 'No matching token transfer found' });
      }

      // Decode Amount (Data field)
      const decimals = getTokenDecimals(network, symbol);
      const onChainAmount = formatUnits(BigInt(transferLog.data), decimals);
      
      if (Math.abs(parseFloat(onChainAmount) - parseFloat(amount)) > 0.001) {
         return NextResponse.json({ 
           verified: false, 
           reason: 'Amount mismatch', 
           expected: amount, 
           received: onChainAmount 
         });
      }

      verified = true;
      actualAmount = onChainAmount;
    }

    if (verified) {
      const supabase = createServerClient();
      const now = new Date().toISOString();
      
      let usdPrice = 0;
      if (symbol === 'USDT' || symbol === 'USDC') usdPrice = 1;
      else if (symbol === 'BNB') usdPrice = 650;
      else if (symbol === 'ETH') usdPrice = 2650;
      
      const usdValue = parseFloat(actualAmount) * usdPrice;

      // Record Transaction
      const { error: txError } = await (supabase.from('transactions') as any).insert({
        user_id: userId,
        type: 'deposit',
        tx_hash: txHash,
        from_address: tx.from,
        to_address: CENTRAL_WALLET,
        amount: actualAmount,
        symbol: symbol,
        usd_value: usdValue,
        status: 'confirmed',
        network: network, // ETH or BSC
        created_at: now,
        confirmed_at: now,
      });

      if (txError) {
        console.error('DB Error:', txError);
      }

      // Update Balance
      await updateUserBalance(userId, usdValue);
      await markTransactionProcessed(txHash, userId);

      return NextResponse.json({ verified: true, amount: actualAmount, txHash });
    }

    return NextResponse.json({ verified: false, reason: 'Unknown verification failure' });

  } catch (error) {
    console.error('Verification Error:', error);
    return NextResponse.json({ 
      error: 'Verification failed', 
      details: error instanceof Error ? error.message : 'Unknown' 
    }, { status: 500 });
  }
}

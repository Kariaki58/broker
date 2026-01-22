import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabaseClient';
import { decryptString } from '@/app/lib/crypto';
import { getTokenContract, getTokenDecimals } from '@/app/lib/tokenContracts';

const TRON_RPC_URL = process.env.RPC_URL || 'https://api.trongrid.io';
const TRON_API_KEY = process.env.TRON_PRO_API_KEY || '';
const TRUST_WALLET_ADDRESS = process.env.NEXT_PUBLIC_TRUST_WALLET_ADDRESS || process.env.TRUST_WALLET_ADDRESS || '';
const CRON_SECRET = process.env.CRON_SECRET;

// Minimum amount (token units) to attempt sweeping to avoid dust sends
const MIN_AMOUNT = 0.000001;

export async function POST(request: NextRequest) {
  try {
    // Protect the endpoint
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;
    if (CRON_SECRET && bearer !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!TRUST_WALLET_ADDRESS) {
      return NextResponse.json({ error: 'Missing TRUST_WALLET_ADDRESS' }, { status: 400 });
    }

    const { TronWeb } = await import('tronweb');

    
    const supabase = createServerClient();

    // Fetch active deposit addresses with encrypted private keys
    const { data: wallets, error } = await supabase
      .from('user_wallet_addresses')
      .select('id, user_id, wallet_address, private_key_enc')
      .eq('purpose', 'deposit')
      .eq('is_active', true);

    if (error || !wallets || wallets.length === 0) {
      return NextResponse.json({
        success: true,
        swept: [],
        message: 'No active deposit addresses found',
      });
    }

    const tokens = ['USDT', 'USDC'] as const;
    const results: any[] = [];

    for (const wallet of wallets) {
      const address = (wallet as { wallet_address: string }).wallet_address;
      const pkEnc = (wallet as { private_key_enc: string | null }).private_key_enc;
      if (!address || !pkEnc) {
        results.push({ address, status: 'skipped', reason: 'missing_private_key' });
        continue;
      }

      let privateKey: string;
      try {
        privateKey = decryptString(pkEnc);
      } catch {
        results.push({ address, status: 'skipped', reason: 'decrypt_failed' });
        continue;
      }

      // TronWeb per-address with private key
      const tronWeb = new TronWeb({
        fullHost: TRON_RPC_URL,
        headers: TRON_API_KEY ? { 'TRON-PRO-API-KEY': TRON_API_KEY } : undefined,
        privateKey,
      });

      for (const symbol of tokens) {
        const contractAddr = getTokenContract('TRON', symbol);
        if (!contractAddr) continue;

        try {
          const contract = await tronWeb.contract().at(contractAddr);
          const rawBalance = await contract.balanceOf(address).call();
          const decimals = getTokenDecimals('TRON', symbol);
          const rawStr = tronWeb.toBigNumber(rawBalance).toString();
          const amount = Number(rawStr) / Math.pow(10, decimals);

          if (amount <= MIN_AMOUNT) {
            results.push({ address, symbol, status: 'skipped', reason: 'dust_or_zero', amount });
            continue;
          }

          // ACTIVATION & FEE CHECK
          const trxBalanceSun = await tronWeb.trx.getBalance(address);
          const trxBalance = Number(tronWeb.fromSun(trxBalanceSun));
          
          if (trxBalance < 15) {
            console.log(`Funding ${address} with TRX for gas... (Current: ${trxBalance} TRX)`);
            const MASTER_PK = process.env.MASTER_PRIVATE_KEY;
            
            if (MASTER_PK) {
              const masterTronWeb = new TronWeb({
                fullHost: TRON_RPC_URL,
                privateKey: MASTER_PK,
                headers: TRON_API_KEY ? { 'TRON-PRO-API-KEY': TRON_API_KEY } : undefined,
              });
              
              const fundTx = await masterTronWeb.trx.sendTransaction(address, 15_000_000); // 15 TRX in Sun
              if (fundTx.result) {
                results.push({ 
                  address, 
                  symbol, 
                  status: 'funded', 
                  message: 'Account activated/funded with 15 TRX for gas',
                  txHash: fundTx.txid 
                });
                // Skip transfer this cycle to allow funding to confirm
                continue; 
              } else {
                results.push({ address, symbol, status: 'error', error: 'Failed to fund TRX from master wallet' });
                continue;
              }
            } else {
              results.push({ address, symbol, status: 'error', error: 'MASTER_PRIVATE_KEY not configured' });
              continue;
            }
          }

          // Transfer full balance to TRUST_WALLET_ADDRESS
          await contract.transfer(TRUST_WALLET_ADDRESS, rawStr).send({
            feeLimit: 50_000_000, // 50 TRX sun limit for execution
          });

          results.push({ address, symbol, status: 'swept', amount });
        } catch (err) {
          results.push({ address, symbol, status: 'error', error: err instanceof Error ? err.message : 'unknown' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      swept: results.filter(r => r.status === 'swept'),
      skipped: results.filter(r => r.status === 'skipped'),
      errors: results.filter(r => r.status === 'error'),
    });
  } catch (error) {
    console.error('Sweep error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sweep deposits',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



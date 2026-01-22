import { NextRequest, NextResponse } from 'next/server';

const TRON_RPC_URL = process.env.RPC_URL || 'https://api.trongrid.io';
const TRON_API_KEY = process.env.TRON_PRO_API_KEY || '';
const MASTER_PK = process.env.MASTER_PRIVATE_KEY;

export async function POST(request: NextRequest) {
  try {
    // Simple admin check (can be improved)
    const { address, amount: amountInput = 15 } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    if (!MASTER_PK) {
      return NextResponse.json({ error: 'MASTER_PRIVATE_KEY not configured' }, { status: 500 });
    }

    // Ensure amount is a number
    const amountNum: number = typeof amountInput === 'string' 
      ? parseFloat(amountInput) 
      : typeof amountInput === 'number' 
        ? amountInput 
        : Number(amountInput);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const { TronWeb } = await import('tronweb');
    const tronWeb = new TronWeb({
      fullHost: TRON_RPC_URL,
      privateKey: MASTER_PK,
      headers: TRON_API_KEY ? { 'TRON-PRO-API-KEY': TRON_API_KEY } : undefined,
    });

    console.log(`Manually funding ${address} with ${amountNum} TRX...`);
    
    // Convert TRX to Sun (1 TRX = 1,000,000 Sun)
    // sendTransaction expects a number, not the result of toSun() which returns string | BigNumber
    const amountInSun: number = amountNum * 1_000_000;
    const fundTx = await tronWeb.trx.sendTransaction(address, amountInSun);
    
    if (fundTx.result) {
      return NextResponse.json({
        success: true,
        message: `Funded ${address} with ${amountNum} TRX`,
        txHash: fundTx.txid
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Transaction failed',
        details: fundTx
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to activate address',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

const TRON_RPC_URL = process.env.TRON_RPC_URL!;
const MASTER_PRIVATE_KEY = process.env.MASTER_PRIVATE_KEY!;
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  try {
    // 🔥 THIS IS THE FIX
    const tronwebModule: any = await import('tronweb');
    const TronWeb =
      tronwebModule.TronWeb ||
      tronwebModule.default?.TronWeb ||
      tronwebModule.default;

    if (typeof TronWeb !== 'function') {
      throw new Error('TronWeb constructor not found');
    }

    const tronWeb = new TronWeb({
      fullHost: TRON_RPC_URL,
      privateKey: MASTER_PRIVATE_KEY,
    });

    if (!tronWeb.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid TRON address' }, { status: 400 });
    }

    // ---- TRX ----
    const trxSun = await tronWeb.trx.getBalance(address);
    const trx = Number(tronWeb.fromSun(trxSun));

    // ---- USDT ----
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const usdtRaw = await contract.balanceOf(address).call();
    const usdt = Number(usdtRaw) / 1_000_000;

    return NextResponse.json({ address, trx, usdt });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed', details: err.message },
      { status: 500 }
    );
  }
}

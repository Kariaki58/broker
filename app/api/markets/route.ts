import { NextResponse } from 'next/server';

// In a real application, this would fetch from a cryptocurrency API
// like CoinGecko, CoinMarketCap, or Binance API
export async function GET() {
  try {
    // Mock market data - replace with actual API call
    const markets = [
      { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change24h: 2.45, volume24h: 28500000000, marketCap: 850000000000 },
      { symbol: 'ETH', name: 'Ethereum', price: 2650.00, change24h: -1.23, volume24h: 12000000000, marketCap: 318000000000 },
      { symbol: 'BNB', name: 'Binance Coin', price: 315.50, change24h: 0.87, volume24h: 1500000000, marketCap: 47300000000 },
      { symbol: 'SOL', name: 'Solana', price: 98.75, change24h: 5.12, volume24h: 2800000000, marketCap: 45000000000 },
      { symbol: 'ADA', name: 'Cardano', price: 0.52, change24h: -0.45, volume24h: 450000000, marketCap: 18500000000 },
      { symbol: 'XRP', name: 'Ripple', price: 0.62, change24h: 1.89, volume24h: 1200000000, marketCap: 34000000000 },
    ];

    return NextResponse.json({ markets });
  } catch (error) {
    console.error('Markets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // In a real application, this would:
    // 1. Query the database for user holdings
    // 2. Fetch current prices from market API
    // 3. Calculate portfolio value and changes
    // 4. Return formatted portfolio data

    // Mock portfolio data
    const holdings = [
      { symbol: 'BTC', name: 'Bitcoin', amount: 0.25, price: 43250.00, value: 10812.50, change24h: 2.45 },
      { symbol: 'ETH', name: 'Ethereum', amount: 2.5, price: 2650.00, value: 6625.00, change24h: -1.23 },
      { symbol: 'SOL', name: 'Solana', amount: 50, price: 98.75, value: 4937.50, change24h: 5.12 },
    ];

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const totalChange = 250.00; // Would be calculated from previous values
    const totalChangePercent = (totalChange / (totalValue - totalChange)) * 100;

    return NextResponse.json({
      walletAddress,
      holdings,
      totalValue,
      totalChange,
      totalChangePercent,
    });
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}


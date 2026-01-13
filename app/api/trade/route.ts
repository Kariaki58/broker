import { NextRequest, NextResponse } from 'next/server';
import { getUserBalance, updateUserBalance } from '@/app/lib/balanceStore';

// In production, use a database
let userHoldings: Record<string, any[]> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, symbol, amount, price } = body;

    // In production, get userId from session/auth
    const userId = request.headers.get('x-user-id') || 'default-user';

    // Validate input
    if (!type || !symbol || !amount || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type !== 'buy' && type !== 'sell') {
      return NextResponse.json(
        { error: 'Invalid trade type' },
        { status: 400 }
      );
    }

    if (amount <= 0 || price <= 0) {
      return NextResponse.json(
        { error: 'Amount and price must be positive' },
        { status: 400 }
      );
    }

    const totalCost = amount * price;
    const currentBalance = getUserBalance(userId);

    if (type === 'buy') {
      // Check if user has sufficient balance
      if (totalCost > currentBalance) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        );
      }

      // Deduct from balance using shared store
      const newBalance = updateUserBalance(userId, -totalCost);

      // Add to holdings
      if (!userHoldings[userId]) {
        userHoldings[userId] = [];
      }
      
      const existingHolding = userHoldings[userId].find(h => h.symbol === symbol);
      if (existingHolding) {
        existingHolding.amount += amount;
        existingHolding.totalCost += totalCost;
      } else {
        userHoldings[userId].push({
          symbol,
          amount,
          totalCost,
          averagePrice: price,
        });
      }
    } else {
      // Sell - check if user has sufficient holdings
      if (!userHoldings[userId]) {
        return NextResponse.json(
          { error: 'No holdings to sell' },
          { status: 400 }
        );
      }

      const holding = userHoldings[userId].find(h => h.symbol === symbol);
      if (!holding || holding.amount < amount) {
        return NextResponse.json(
          { error: 'Insufficient holdings' },
          { status: 400 }
        );
      }

      // Add to balance using shared store
      const newBalance = updateUserBalance(userId, totalCost);

      // Update holdings
      holding.amount -= amount;
      if (holding.amount <= 0) {
        userHoldings[userId] = userHoldings[userId].filter(h => h.symbol !== symbol);
      }
    }

    // In a real application, this would:
    // 1. Update database with transaction
    // 2. Execute the trade via exchange API or smart contract
    // 3. Update user balance and holdings in database
    // 4. Return transaction hash

    return NextResponse.json({
      success: true,
      type,
      symbol,
      amount,
      price,
      totalCost,
      newBalance: getUserBalance(userId),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


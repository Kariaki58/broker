import { NextRequest, NextResponse } from 'next/server';
import { getUserBalance, updateUserBalance } from '@/app/lib/balanceStore';

export async function GET(request: NextRequest) {
  try {
    // In production, get userId from session/auth
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    const balance = getUserBalance(userId);

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('Balance API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Update balance using shared store (prevents server-to-server HTTP calls)
    const newBalance = updateUserBalance(userId, amount);

    return NextResponse.json({
      success: true,
      balance: newBalance,
    });
  } catch (error) {
    console.error('Balance update error:', error);
    return NextResponse.json(
      { error: 'Failed to update balance' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getUserBalance, updateUserBalance } from '@/app/lib/supabaseBalanceStore';
import { requireAuth } from '@/app/lib/authHelpers';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const balance = await getUserBalance(userId);

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('Balance API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch balance' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { amount } = body;

    if (typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const newBalance = await updateUserBalance(userId, amount);

    return NextResponse.json({
      success: true,
      balance: newBalance,
    });
  } catch (error) {
    console.error('Balance update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update balance' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}


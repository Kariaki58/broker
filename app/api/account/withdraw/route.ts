import { NextRequest, NextResponse } from 'next/server';
import { getUserBalance, updateUserBalance } from '@/app/lib/supabaseBalanceStore';
import { requireAuth } from '@/app/lib/authHelpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { amount, walletAddress } = body;

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format (basic check)
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Check current balance
    const currentBalance = await getUserBalance(userId);
    
    if (amount > currentBalance) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Minimum withdrawal amount
    const minWithdrawal = 10;
    if (amount < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is $${minWithdrawal}` },
        { status: 400 }
      );
    }

    // Deduct from balance
    const newBalance = await updateUserBalance(userId, -amount);

    // In production, this would:
    // 1. Create a withdrawal request record
    // 2. Queue the withdrawal for processing
    // 3. Send notification to user
    // 4. Process the actual crypto transfer

    return NextResponse.json({
      success: true,
      amount,
      walletAddress,
      newBalance,
      message: 'Withdrawal request submitted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process withdrawal' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}


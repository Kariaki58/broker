import { NextRequest, NextResponse } from 'next/server';
import { withdrawReferralEarnings, getReferralStats } from '@/app/lib/supabaseReferralStore';
import { updateUserBalance } from '@/app/lib/supabaseBalanceStore';
import { getUserById } from '@/app/lib/supabaseAuthStore';
import { requireAuth } from '@/app/lib/authHelpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    // Verify user exists
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check pending earnings before withdrawing
    const stats = await getReferralStats(userId);
    if (stats.pendingEarnings <= 0) {
      return NextResponse.json(
        { error: 'No earnings available to withdraw' },
        { status: 400 }
      );
    }

    const earnings = await withdrawReferralEarnings(userId);
    
    if (earnings <= 0) {
      return NextResponse.json(
        { error: 'No earnings available to withdraw' },
        { status: 400 }
      );
    }

    // Add to user balance
    const newBalance = await updateUserBalance(userId, earnings);

    return NextResponse.json({
      success: true,
      amount: parseFloat(earnings.toFixed(2)),
      newBalance: parseFloat(newBalance.toFixed(2)),
      message: 'Withdrawal successful',
    });
  } catch (error) {
    console.error('Referral withdraw error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


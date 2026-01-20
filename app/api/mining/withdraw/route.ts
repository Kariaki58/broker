import { NextRequest, NextResponse } from 'next/server';
import { updateUserBalance } from '@/app/lib/supabaseBalanceStore';
import { getMiningRecord, updateMiningRecord } from '@/app/lib/supabaseMiningStore';
import { getReferralByReferredId, addReferralTransaction } from '@/app/lib/supabaseReferralStore';
import { requireAuth } from '@/app/lib/authHelpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { miningId } = body;

    if (!miningId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get mining record
    const record = await getMiningRecord(miningId);

    if (!record || record.userId !== userId) {
      return NextResponse.json(
        { error: 'Mining record not found' },
        { status: 404 }
      );
    }

    // Check if withdrawal is available
    const now = new Date();
    const nextWithdrawal = new Date(record.nextWithdrawal);

    if (now < nextWithdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not available yet. Please wait until the next withdrawal date.' },
        { status: 400 }
      );
    }

    // Calculate earnings since last withdrawal
    const startDate = new Date(record.startDate);
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyEarnings = (record.amount * record.dailyYield) / 100;
    const totalEarnings = dailyEarnings * daysElapsed;
    const withdrawableAmount = totalEarnings - (record.totalEarnings || 0);

    if (withdrawableAmount <= 0) {
      return NextResponse.json(
        { error: 'No earnings available to withdraw' },
        { status: 400 }
      );
    }

    // Update balance
    await updateUserBalance(userId, withdrawableAmount);

    // Track referral commission if user was referred
    const referral = await getReferralByReferredId(userId);
    if (referral) {
      const commission = withdrawableAmount * 0.05; // 5% commission on withdrawal
      await addReferralTransaction({
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        referralId: referral.id,
        type: 'withdrawal',
        amount: withdrawableAmount,
        commission,
        date: new Date().toISOString(),
      });
    }

    // Update mining record
    const nextWithdrawalDate = new Date(now);
    nextWithdrawalDate.setDate(nextWithdrawalDate.getDate() + 7);
    await updateMiningRecord(miningId, {
      totalEarnings: totalEarnings,
      lastWithdrawal: now.toISOString(),
      nextWithdrawal: nextWithdrawalDate.toISOString(),
    });

    const updatedRecord = await getMiningRecord(miningId);
    
    return NextResponse.json({
      success: true,
      amount: parseFloat(withdrawableAmount.toFixed(2)),
      message: 'Withdrawal successful',
      nextWithdrawal: updatedRecord?.nextWithdrawal || record.nextWithdrawal,
    });
  } catch (error) {
    console.error('Mining withdraw error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


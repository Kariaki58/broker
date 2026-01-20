import { NextRequest, NextResponse } from 'next/server';
import { getUserBalance, updateUserBalance } from '@/app/lib/supabaseBalanceStore';
import { addMiningRecord, MiningRecord } from '@/app/lib/supabaseMiningStore';
import { getReferralByReferredId, addReferralTransaction } from '@/app/lib/supabaseReferralStore';
import { getUserById } from '@/app/lib/supabaseAuthStore';
import { requireAuth } from '@/app/lib/authHelpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { planId, amount } = body;

    if (!planId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate plan
    const planConfigs: Record<string, { min: number; max: number; dailyYield: number; duration: number }> = {
      'super-model-x': { min: 600, max: 2000, dailyYield: 2.9, duration: 280 },
      'super-model-d': { min: 300, max: 1000, dailyYield: 2.7, duration: 180 },
      'super-model-c': { min: 100, max: 500, dailyYield: 2.6, duration: 90 },
      // Legacy plan IDs for backward compatibility
      starter: { min: 100, max: 1000, dailyYield: 3.0, duration: 30 },
      professional: { min: 1000, max: 10000, dailyYield: 3.0, duration: 60 },
      enterprise: { min: 10000, max: 100000, dailyYield: 3.0, duration: 90 },
    };

    const plan = planConfigs[planId];
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    if (amount < plan.min || amount > plan.max) {
      return NextResponse.json(
        { error: `Amount must be between $${plan.min} and $${plan.max}` },
        { status: 400 }
      );
    }

    // Check balance
    const currentBalance = await getUserBalance(userId);
    if (amount > currentBalance) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Deduct from balance
    await updateUserBalance(userId, -amount);

    // Create mining record
    const now = new Date();
    const nextWithdrawal = new Date(now);
    nextWithdrawal.setDate(nextWithdrawal.getDate() + 7); // Weekly withdrawal

    const miningRecord: MiningRecord = {
      id: `mining-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      planId,
      amount,
      startDate: now.toISOString(),
      dailyYield: plan.dailyYield,
      totalEarnings: 0,
      lastWithdrawal: null,
      nextWithdrawal: nextWithdrawal.toISOString(),
    };

    await addMiningRecord(miningRecord);

    // Track referral commission if user was referred
    const referral = await getReferralByReferredId(userId);
    if (referral) {
      const commission = amount * 0.10; // 10% commission on investment
      await addReferralTransaction({
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        referralId: referral.id,
        type: 'investment',
        amount,
        commission,
        date: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      miningId: miningRecord.id,
      message: 'Mining started successfully',
    });
  } catch (error) {
    console.error('Mining start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getMiningRecords } from '@/app/lib/supabaseMiningStore';
import { requireAuth } from '@/app/lib/authHelpers';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const records = await getMiningRecords(userId);
    const now = new Date();

    // Calculate earnings for each mining record
    const activeMining = records.map(record => {
      const startDate = new Date(record.startDate);
      const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate daily earnings (3% of investment)
      const dailyEarnings = (record.amount * record.dailyYield) / 100;
      
      // Calculate total earnings (daily earnings * days elapsed, minus any withdrawals)
      const totalEarnings = dailyEarnings * daysElapsed;

      return {
        id: record.id,
        planId: record.planId,
        amount: record.amount,
        startDate: record.startDate,
        dailyEarnings: parseFloat(dailyEarnings.toFixed(2)),
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        nextWithdrawal: record.nextWithdrawal,
      };
    });

    const totalEarnings = activeMining.reduce((sum, m) => sum + m.totalEarnings, 0);

    return NextResponse.json({
      activeMining,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    });
  } catch (error) {
    console.error('Mining status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


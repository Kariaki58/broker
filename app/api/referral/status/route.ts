import { NextRequest, NextResponse } from 'next/server';
import { getReferrals, getReferralStats } from '@/app/lib/supabaseReferralStore';
import { getUserById } from '@/app/lib/supabaseAuthStore';
import { requireAuth } from '@/app/lib/authHelpers';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    // Get user to retrieve referral code
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const referralCode = user.referralCode;

    // Generate shareable referral link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const referralLink = `${baseUrl}/register?ref=${referralCode}`;
    
    const stats = await getReferralStats(userId);
    const referrals = (await getReferrals(userId))
      .sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime())
      .map(r => ({
        id: r.id,
        email: r.email,
        joinedDate: r.joinedDate,
        status: r.status,
        earnings: parseFloat(r.totalEarnings.toFixed(2)),
      }));

    return NextResponse.json({
      referralCode,
      referralLink,
      stats: {
        totalReferrals: stats.totalReferrals,
        activeReferrals: stats.activeReferrals,
        totalEarnings: parseFloat(stats.totalEarnings.toFixed(2)),
        pendingEarnings: parseFloat(stats.pendingEarnings.toFixed(2)),
      },
      referrals,
    });
  } catch (error) {
    console.error('Referral status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/app/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, walletAddress, referrerCode } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create user
    const user = createUser(userId, email, walletAddress, referrerCode);

    // Track referral signup if referrer code is provided
    // This is done synchronously using the referral store directly
    if (referrerCode) {
      try {
        const { getReferralByCode, addReferral } = await import('@/app/lib/referralStore');
        const referrerId = getReferralByCode(referrerCode);
        
        if (referrerId && referrerId !== userId) {
          addReferral({
            id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            referrerId,
            referredId: userId,
            email: email || user.email,
            joinedDate: new Date().toISOString(),
            status: 'pending',
            totalEarnings: 0,
            pendingEarnings: 0,
          });
        }
      } catch (error) {
        // Log but don't fail user creation if referral tracking fails
        console.error('Error tracking referral signup:', error);
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}


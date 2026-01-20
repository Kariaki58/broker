import { NextRequest, NextResponse } from 'next/server';
import { registerUser, getUserIdByReferralCode } from '@/app/lib/supabaseAuthStore';
import { addReferral } from '@/app/lib/supabaseReferralStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, walletAddress, referrerCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Register user
    const result = await registerUser(email, password, walletAddress, referrerCode);

    // Handle referral if referrer code is provided
    if (referrerCode) {
      try {
        const referrerId = await getUserIdByReferralCode(referrerCode);
        if (referrerId && referrerId !== result.user.id) {
          await addReferral({
            id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            referrerId,
            referredId: result.user.id,
            email: result.user.email,
            joinedDate: new Date().toISOString(),
            status: 'pending',
            totalEarnings: 0,
            pendingEarnings: 0,
          });
        }
      } catch (error) {
        // Log but don't fail registration if referral tracking fails
        console.error('Error tracking referral signup:', error);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        walletAddress: result.user.walletAddress,
        depositAddress: result.user.depositAddress,
        referralCode: result.user.referralCode,
      },
      sessionToken: result.sessionToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { addReferral, getReferralByReferredId } from '@/app/lib/supabaseReferralStore';
import { addReferralTransaction } from '@/app/lib/supabaseReferralStore';
import { getUserById, getUserIdByReferralCode } from '@/app/lib/supabaseAuthStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, userId, amount, referralCode, email } = body;

    if (!type || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: type and userId are required' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If referralCode is provided, this is a new signup
    if (referralCode && type === 'signup') {
      const referrerId = await getUserIdByReferralCode(referralCode);
      
      if (!referrerId) {
        return NextResponse.json(
          { error: 'Invalid referral code' },
          { status: 400 }
        );
      }

      if (referrerId === userId) {
        return NextResponse.json(
          { error: 'Cannot refer yourself' },
          { status: 400 }
        );
      }

      // Check if referral already exists
      const existingReferral = await getReferralByReferredId(userId);
      if (existingReferral) {
        return NextResponse.json({
          success: true,
          message: 'Referral already exists',
        });
      }

      // Create referral record
      await addReferral({
        id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        referrerId,
        referredId: userId,
        email: email || user.email,
        joinedDate: new Date().toISOString(),
        status: 'pending',
        totalEarnings: 0,
        pendingEarnings: 0,
      });

      return NextResponse.json({
        success: true,
        message: 'Referral signup tracked successfully',
      });
    }

    // Track investment or withdrawal
    if (type === 'investment' || type === 'withdrawal') {
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: 'Valid amount is required' },
          { status: 400 }
        );
      }

      const referral = await getReferralByReferredId(userId);
      if (!referral) {
        // No referral found, but this is not an error - user just wasn't referred
        return NextResponse.json({
          success: true,
          message: 'No referral found for this user',
        });
      }

      const commissionRate = type === 'investment' ? 0.10 : 0.05; // 10% on investment, 5% on withdrawal
      const commission = parseFloat((amount * commissionRate).toFixed(2));

      await addReferralTransaction({
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        referralId: referral.id,
        type: type === 'investment' ? 'investment' : 'withdrawal',
        amount: parseFloat(amount.toFixed(2)),
        commission,
        date: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Referral transaction tracked successfully',
        commission,
      });
    }

    return NextResponse.json(
      { error: 'Invalid type. Must be signup, investment, or withdrawal' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Referral track error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


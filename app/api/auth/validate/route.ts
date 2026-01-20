import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/app/lib/supabaseAuthStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
      referralCode: user.referralCode || `REF-${user.id.substring(0, 8).toUpperCase()}`,
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
  }
}


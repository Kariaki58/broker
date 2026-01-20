import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/app/lib/supabaseAuthStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        walletAddress: result.user.walletAddress,
        referralCode: result.user.referralCode,
      },
      sessionToken: result.sessionToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    );
  }
}


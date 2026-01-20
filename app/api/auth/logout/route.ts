import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/app/lib/supabaseAuthStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    if (sessionToken) {
      await logoutUser(sessionToken);
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}


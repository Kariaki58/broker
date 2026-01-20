import { NextRequest, NextResponse } from 'next/server';
import { processMiningRewards } from '@/app/lib/miningLogic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await processMiningRewards(userId);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error processing rewards:', error);
    return NextResponse.json(
      { error: 'Failed to process rewards' },
      { status: 500 }
    );
  }
}

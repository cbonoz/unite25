import { NextRequest, NextResponse } from 'next/server';
import { TipJarConfig } from '../../../../utils/storage';

// In-memory storage for demo (same as in other routes)
const tipJars = new Map<string, TipJarConfig>();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const tipJar = tipJars.get(id);

    if (!tipJar) {
      return NextResponse.json(
        { error: 'Tip jar not found' },
        { status: 404 }
      );
    }

    // Increment tip count
    const updatedTipJar: TipJarConfig = {
      ...tipJar,
      totalTips: (tipJar.totalTips || 0) + 1,
      lastTipAt: new Date().toISOString(),
    };

    tipJars.set(id, updatedTipJar);

    return NextResponse.json({
      success: true,
      tipJar: updatedTipJar
    });
  } catch (error) {
    console.error('Error incrementing tip count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

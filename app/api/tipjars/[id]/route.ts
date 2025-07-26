import { NextRequest, NextResponse } from 'next/server';
import { tipJarStore } from '../../../lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const tipJar = tipJarStore.getTipJar(id);

    if (!tipJar) {
      return NextResponse.json(
        { error: 'Tip jar not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tipJar
    });
  } catch (error) {
    console.error('Error fetching tip jar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates = await request.json();

    const updatedTipJar = tipJarStore.updateTipJar(id, updates);

    if (!updatedTipJar) {
      return NextResponse.json(
        { error: 'Tip jar not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tipJar: updatedTipJar
    });
  } catch (error) {
    console.error('Error updating tip jar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

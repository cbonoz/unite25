import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ONE_INCH_API_KEY;
const BASE_URL = 'https://api.1inch.dev';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; orderHash: string }> }
) {
  try {
    const { chainId, orderHash } = await params;

    console.log('📊 Checking Fusion+ order status:', { chainId, orderHash });

    const response = await fetch(`${BASE_URL}/fusion/v1.0/${chainId}/order/status/${orderHash}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Fusion+ API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📋 Order status:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching Fusion+ order status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order status' },
      { status: 500 }
    );
  }
}

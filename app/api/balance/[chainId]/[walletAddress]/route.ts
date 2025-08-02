import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ONE_INCH_API_KEY;
const BASE_URL = 'https://api.1inch.dev';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; walletAddress: string }> }
) {
  try {
    const { chainId, walletAddress } = await params;

    const response = await fetch(`${BASE_URL}/balance/v1.2/${chainId}/${walletAddress}?provider=1inch`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`1inch API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching wallet balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balances' },
      { status: 500 }
    );
  }
}

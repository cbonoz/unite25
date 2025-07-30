import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_ONE_INCH_API_KEY;
const BASE_URL = 'https://api.1inch.dev';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; tokenAddress: string }> }
) {
  try {
    const { chainId, tokenAddress } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const spenderAddress = searchParams.get('spender');

    if (!walletAddress || !spenderAddress) {
      return NextResponse.json(
        { error: 'Missing wallet or spender address' },
        { status: 400 }
      );
    }

    console.log('🔍 Checking token allowance:', {
      chainId,
      tokenAddress,
      walletAddress,
      spenderAddress
    });

    // Use 1inch Web3 API to check token allowance
    const response = await fetch(
      `${BASE_URL}/web3/v1.2/${chainId}/allowance?tokenAddress=${tokenAddress}&walletAddress=${walletAddress}&spenderAddress=${spenderAddress}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ 1inch allowance API error:', response.status, errorData);
      throw new Error(`1inch API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Token allowance fetched:', data);

    return NextResponse.json({
      allowance: data.allowance || '0',
      tokenAddress,
      walletAddress,
      spenderAddress,
    });

  } catch (error) {
    console.error('❌ Error fetching token allowance:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch token allowance',
        allowance: '0'
      },
      { status: 500 }
    );
  }
}

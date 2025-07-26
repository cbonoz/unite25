import { NextRequest, NextResponse } from 'next/server';
import { TipJarConfig } from '../../utils/storage';
import { tipJarStore } from '../../lib/store';

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    // Validate required fields
    if (!config.displayName || !config.walletAddress) {
      return NextResponse.json(
        { error: 'Display name and wallet address are required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(config.walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = config.customUrl || config.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if ID already exists
    if (tipJarStore.tipJarExists(id)) {
      return NextResponse.json(
        { error: 'Tip jar with this ID already exists' },
        { status: 409 }
      );
    }

    // Create tip jar
    const tipJar: TipJarConfig = {
      id,
      displayName: config.displayName,
      walletAddress: config.walletAddress,
      preferredStablecoin: config.preferredStablecoin || 'USDC',
      customUrl: config.customUrl || '',
      selectedChains: config.selectedChains || [1], // Default to Ethereum
      createdAt: new Date().toISOString(),
      totalTips: 0,
    };

    tipJarStore.saveTipJar(tipJar);

    return NextResponse.json({
      success: true,
      id,
      tipJar
    });
  } catch (error) {
    console.error('Error creating tip jar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allTipJars = tipJarStore.getAllTipJars();
    return NextResponse.json({
      success: true,
      tipJars: allTipJars
    });
  } catch (error) {
    console.error('Error fetching tip jars:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

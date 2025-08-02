import { NextResponse } from 'next/server';

const STELLAR_BRIDGE_SECRET_KEY = process.env.STELLAR_BRIDGE_SECRET_KEY || '';

export async function GET() {
  return NextResponse.json({
    stellar_bridge_secret_exists: STELLAR_BRIDGE_SECRET_KEY.substring(0, 4) + '...' + STELLAR_BRIDGE_SECRET_KEY.substring(STELLAR_BRIDGE_SECRET_KEY.length - 4),
    stellar_network: process.env.STELLAR_NETWORK,
    stellar_keys: Object.keys(process.env).filter(key => key.includes('STELLAR')),
    total_env_vars: Object.keys(process.env).length,
  });
}

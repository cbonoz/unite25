// Storacha (web3.storage) integration for SwapJar tip jar configurations
//
// For production with Storacha, set:
// 1. NEXT_PUBLIC_STORACHA_PROOF - Base64 encoded proof delegation
// 2. NEXT_PUBLIC_STORACHA_SPACE - Space name (optional, extracted from proof)
//
// To get the proof:
// 1. Install CLI: npm install -g @storacha/cli
// 2. Create account: storacha login your@email.com
// 3. Create space: storacha space create "your-space-name"
// 4. Get proof: storacha delegation create <space-did> --can 'space/*' --can 'upload/*' --can 'store/*' --output proof.ucan
// 5. Encode proof: base64 proof.ucan (or use storacha key export)
//
import * as Client from '@storacha/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';
import { siteConfig } from '@/app/siteConfig';
import { type ChainId } from './oneinch';

// Environment variables for Storacha
const STORACHA_PROOF = process.env.NEXT_PUBLIC_STORACHA_PROOF;
const STORACHA_KEY = process.env.NEXT_PUBLIC_STORACHA_KEY;

// Tip jar configuration interface - simplified for read-only storage
export interface TipJarConfig {
  id: string;
  name: string;
  description?: string;
  walletAddress: string;
  recipientToken: string; // Updated to support dynamic tokens
  chains: ChainId[];
  createdAt: string;
  isActive: boolean;
  customMessage?: string;
  successMessage?: string;
  customization?: {
    primaryColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
  };
}

// Store tip jar configuration to Storacha
export async function storeTipJarConfig(config: TipJarConfig): Promise<string> {
  try {
    if (!STORACHA_PROOF) {
      throw new Error('STORACHA_PROOF environment variable is required');
    }

    if (!STORACHA_KEY) {
      throw new Error('STORACHA_KEY environment variable is required');
    }

    console.log('Creating Storacha client with principal...');

    // Load client with specific private key
    const principal = Signer.parse(STORACHA_KEY);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });

    // Add proof that this agent has been delegated capabilities on the space
    console.log('Parsing proof...');
    const proof = await Proof.parse(STORACHA_PROOF);

    console.log('Adding space from proof...');
    const space = await client.addSpace(proof);

    console.log('Setting current space...');
    await client.setCurrentSpace(space.did());

    console.log('Using space:', space.did());

    // Verify we have a current space
    const currentSpace = client.currentSpace();
    if (!currentSpace) {
      throw new Error('No current space set after adding proof');
    }

    console.log('Current space confirmed:', currentSpace.did());

    // Convert config to JSON and create a file
    const configJson = JSON.stringify(config, null, 2);
    const file = new File([configJson], `tipjar-${config.id}.json`, {
      type: 'application/json',
    });

    console.log(`File created: ${file.name}, size: ${file.size} bytes`);
    console.log('Starting upload...');

    // Upload the file with explicit options
    const cid = await client.uploadFile(file, {
      retries: 5,
      shardSize: 1024 * 1024, // 1MB shards
    });

    console.log(`Successfully stored tip jar config with CID: ${cid}`);
    return cid.toString();

  } catch (error) {
    console.error('Error storing tip jar config:', error);

    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error details:');
      console.error('- Name:', error.name);
      console.error('- Message:', error.message);
      console.error('- Stack:', error.stack);

      // Check for specific error types
      if (error.message.includes('space/blob/add') || error.message.includes('blob/add')) {
        console.error('\n🔒 Permission Error Detected:');
        console.error('Your proof may not have the required capabilities.');
        console.error('Please ensure your delegation includes:');
        console.error('- space/*');
        console.error('- upload/*');
        console.error('- store/*');
        console.error('- blob/*');
      }

      if (error.message.includes('failed space/blob/add invocation')) {
        console.error('\n🚨 Space/blob/add invocation failed.');
        console.error('This usually means the space doesn\'t have permission to add blobs.');
        console.error('Try regenerating your proof with full permissions.');
      }
    }

    throw new Error(`Failed to store tip jar config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Retrieve tip jar configuration from Storacha using CID
export async function retrieveTipJarConfig(cid: string): Promise<TipJarConfig | null> {
  try {
    console.log(`🔍 Attempting to retrieve tip jar config for CID: ${cid}`);

    // Use the storacha.link gateway to fetch the content directly
    const gatewayUrl = `https://${cid}.ipfs.storacha.link`;
    console.log(`📡 Fetching from gateway: ${gatewayUrl}`);

    const response = await fetch(gatewayUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`❌ Tip jar config not found for CID: ${cid}`);
        return null;
      }
      throw new Error(`Failed to retrieve data for CID: ${cid} (${response.status})`);
    }

    const content = await response.text();
    console.log(`📄 Retrieved content length: ${content.length} characters`);
    console.log(`📄 Content preview: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);

    // Parse and return the configuration
    const config: TipJarConfig = JSON.parse(content);
    console.log(`✅ Successfully parsed tip jar config:`, {
      id: config.id,
      name: config.name,
      walletAddress: config.walletAddress,
      chains: config.chains,
      recipientToken: config.recipientToken
    });

    return config;
  } catch (error) {
    console.error('❌ Error retrieving tip jar config:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
    }
    return null;
  }
}

// Note: Keeping Storacha simple - create once, read many times
// No updates or increments to avoid complexity and additional storage costs

// Create a new tip jar configuration
export async function createTipJar(data: {
  name: string;
  description?: string;
  walletAddress: string;
  recipientToken: string; // Updated to support dynamic tokens
  chains: ChainId[];
  customMessage?: string;
  successMessage?: string;
  customization?: TipJarConfig['customization'];
}): Promise<{ config: TipJarConfig; cid: string }> {
  try {
    const id = generateTipJarId();
    const now = new Date().toISOString();

    const config: TipJarConfig = {
      id,
      name: data.name,
      description: data.description,
      walletAddress: data.walletAddress,
      recipientToken: data.recipientToken,
      chains: data.chains,
      createdAt: now,
      isActive: true,
      customMessage: data.customMessage,
      successMessage: data.successMessage,
      customization: data.customization,
    };

    const cid = await storeTipJarConfig(config);

    return { config, cid };
  } catch (error) {
    console.error('Error creating tip jar:', error);
    throw error;
  }
}

// Generate a unique tip jar ID
function generateTipJarId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}

// Validate CID format (basic validation)
export function isValidCID(cid: string): boolean {
  // More comprehensive CID validation:
  // - CIDv0: Qm followed by 44 base58 characters
  // - CIDv1: baf followed by base32 characters (various lengths)
  // - Raw CIDv1: bafkrei, bafkreia, etc.
  // - DAG-PB CIDv1: bafy, bafyb, etc.

  if (!cid || typeof cid !== 'string') {
    return false;
  }

  // CIDv0 format
  if (/^Qm[A-Za-z0-9]{44}$/.test(cid)) {
    return true;
  }

  // CIDv1 format - starts with 'baf' and contains base32 characters
  if (/^baf[a-z2-7]{50,}$/.test(cid)) {
    return true;
  }

  return false;
}

// Get tip jar URL
export function getTipJarUrl(cid: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : siteConfig.appUrl;

  return `${baseUrl}/tip/${cid}`;
}

// Export utility for client-side usage
export const web3StorageUtils = {
  storeTipJarConfig,
  retrieveTipJarConfig,
  createTipJar,
  isValidCID,
  getTipJarUrl,
};

// Storage utilities for tip jar data
import { ChainId } from './oneinch';

export interface TipJarConfig {
  id: string;
  displayName: string;
  walletAddress: string;
  preferredStablecoin: 'USDC' | 'DAI' | 'USDT';
  customUrl: string;
  selectedChains: ChainId[];
  createdAt: string;
  totalTips?: number;
  lastTipAt?: string;
}

// Local Storage implementation (for demo/client-side storage)
export class LocalTipJarStorage {
  private static readonly STORAGE_KEY = 'swapjar_tipjars';

  static saveTipJar(config: Omit<TipJarConfig, 'id' | 'createdAt'>): string {
    const tipJars = this.getAllTipJars();
    const id = config.customUrl || config.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const tipJar: TipJarConfig = {
      ...config,
      id,
      createdAt: new Date().toISOString(),
      totalTips: 0,
    };

    tipJars[id] = tipJar;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tipJars));
    return id;
  }

  static getTipJar(id: string): TipJarConfig | null {
    const tipJars = this.getAllTipJars();
    return tipJars[id] || null;
  }

  static getAllTipJars(): Record<string, TipJarConfig> {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  static updateTipJar(id: string, updates: Partial<TipJarConfig>): boolean {
    const tipJars = this.getAllTipJars();
    if (!tipJars[id]) return false;

    tipJars[id] = { ...tipJars[id], ...updates };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tipJars));
    return true;
  }

  static incrementTipCount(id: string): void {
    const tipJar = this.getTipJar(id);
    if (tipJar) {
      this.updateTipJar(id, {
        totalTips: (tipJar.totalTips || 0) + 1,
        lastTipAt: new Date().toISOString(),
      });
    }
  }
}

// API-based storage (for production with backend)
export class ApiTipJarStorage {
  private static readonly BASE_URL = '/api/tipjars';

  static async saveTipJar(config: Omit<TipJarConfig, 'id' | 'createdAt'>): Promise<string> {
    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to save tip jar');
    }

    const { id } = await response.json();
    return id;
  }

  static async getTipJar(id: string): Promise<TipJarConfig | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  static async updateTipJar(id: string, updates: Partial<TipJarConfig>): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async incrementTipCount(id: string): Promise<void> {
    await fetch(`${this.BASE_URL}/${id}/tip`, {
      method: 'POST',
    });
  }
}

// IPFS storage (for decentralized storage)
export class IPFSTipJarStorage {
  private static readonly IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
  private static readonly PIN_SERVICE = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

  static async saveTipJar(config: Omit<TipJarConfig, 'id' | 'createdAt'>): Promise<string> {
    const id = config.customUrl || config.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const tipJar: TipJarConfig = {
      ...config,
      id,
      createdAt: new Date().toISOString(),
      totalTips: 0,
    };

    // In a real implementation, you'd pin to IPFS here
    // For now, fall back to localStorage
    return LocalTipJarStorage.saveTipJar(config);
  }

  static async getTipJar(id: string): Promise<TipJarConfig | null> {
    // In a real implementation, you'd fetch from IPFS
    // For now, fall back to localStorage
    return LocalTipJarStorage.getTipJar(id);
  }
}

// Main storage interface that can switch between implementations
export type StorageImplementation = 'local' | 'api' | 'ipfs';

export class TipJarStorage {
  private static implementation: StorageImplementation = 'local';

  static setImplementation(impl: StorageImplementation) {
    this.implementation = impl;
  }

  static async saveTipJar(config: Omit<TipJarConfig, 'id' | 'createdAt'>): Promise<string> {
    switch (this.implementation) {
      case 'api':
        return ApiTipJarStorage.saveTipJar(config);
      case 'ipfs':
        return IPFSTipJarStorage.saveTipJar(config);
      default:
        return LocalTipJarStorage.saveTipJar(config);
    }
  }

  static async getTipJar(id: string): Promise<TipJarConfig | null> {
    switch (this.implementation) {
      case 'api':
        return ApiTipJarStorage.getTipJar(id);
      case 'ipfs':
        return IPFSTipJarStorage.getTipJar(id);
      default:
        return LocalTipJarStorage.getTipJar(id);
    }
  }

  static async updateTipJar(id: string, updates: Partial<TipJarConfig>): Promise<boolean> {
    switch (this.implementation) {
      case 'api':
        return ApiTipJarStorage.updateTipJar(id, updates);
      case 'ipfs':
        // IPFS is immutable, so updates would create new entries
        return false;
      default:
        return LocalTipJarStorage.updateTipJar(id, updates);
    }
  }

  static async incrementTipCount(id: string): Promise<void> {
    switch (this.implementation) {
      case 'api':
        return ApiTipJarStorage.incrementTipCount(id);
      case 'ipfs':
        // IPFS is immutable, so tip counts would need separate tracking
        return;
      default:
        return LocalTipJarStorage.incrementTipCount(id);
    }
  }
}

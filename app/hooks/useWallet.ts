'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    provider: null,
    signer: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setWallet(prev => ({ ...prev, error: 'Please install MetaMask or another Web3 wallet' }));
      return;
    }

    try {
      setWallet(prev => ({ ...prev, isConnecting: true, error: null }));

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setWallet({
        isConnected: true,
        address,
        provider,
        signer,
        chainId: Number(network.chainId),
        isConnecting: false,
        error: null,
      });

      console.log('🔗 Wallet connected:', { address, chainId: Number(network.chainId) });
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      }));
    }
  };

  const disconnectWallet = () => {
    setWallet({
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
      chainId: null,
      isConnecting: false,
      error: null,
    });
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: unknown) {
      // Chain not added to wallet
      if (error && typeof error === 'object' && 'code' in error && error.code === 4902) {
        console.error('Chain not added to wallet:', targetChainId);
      }
      throw error;
    }
  };

  // Listen for account and network changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (wallet.isConnected && accounts[0] !== wallet.address) {
        // Account changed, reconnect
        connectWallet();
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainId = args[0] as string;
      if (wallet.isConnected) {
        setWallet(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [wallet.isConnected, wallet.address]);

  return {
    ...wallet,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

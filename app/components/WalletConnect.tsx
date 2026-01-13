'use client';

import { useState, useEffect } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { ethers } from 'ethers';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<string>('0.00');

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const address = accounts[0].address;
          setAccount(address);
          updateBalance(address);
          onConnect?.(address);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const updateBalance = async (address: string) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      const formatted = ethers.formatEther(balance);
      setBalance(parseFloat(formatted).toFixed(4));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setAccount(address);
      updateBalance(address);
      onConnect?.(address);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
        }
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance('0.00');
    onDisconnect?.();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (account) {
    return (
      <div className="flex items-center space-x-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2">
        <Wallet className="text-blue-600 dark:text-blue-400" size={20} />
        <div className="flex flex-col">
          <span className="text-xs text-gray-600 dark:text-gray-400">Connected</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatAddress(account)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-600 dark:text-gray-400">Balance</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {balance} ETH
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="ml-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Disconnect wallet"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Wallet size={20} />
      <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
    </button>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (args: any) => void) => void;
      removeListener: (event: string, callback: (args: any) => void) => void;
    };
  }
}


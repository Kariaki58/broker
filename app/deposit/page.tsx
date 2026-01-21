'use client';

import { useState } from 'react';
import { useAuth } from '@/app/lib/authContext';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export default function DepositPage() {
  const { user } = useAuth();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [amount, setAmount] = useState('0.1');
  const [selectedNetwork, setSelectedNetwork] = useState<'BSC' | 'ETH'>('BSC');
  const [selectedAsset, setSelectedAsset] = useState('BNB');
  const [inputSenderAddress, setInputSenderAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const centralWallet = process.env.NEXT_PUBLIC_CENTRAL_WALLET_ADDRESS || '0x...';
  
  // Available assets based on network
  const availableAssets = selectedNetwork === 'BSC' 
    ? ['BNB', 'USDT', 'USDC']
    : ['ETH', 'USDT', 'USDC'];

  // QR Code URL
  const qrData = `ethereum:${centralWallet}?value=${amount}`;

  const handleVerify = async () => {
    if (!txHash) {
      setStatusMessage('Please enter a transaction hash');
      return;
    }

    setStatus('checking');
    setStatusMessage(`Verifying on ${selectedNetwork}...`);

    try {
      const response = await fetch('/api/verify-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          amount,
          txHash,
          symbol: selectedAsset,
          network: selectedNetwork,
          senderAddress: inputSenderAddress || address, 
        }),
      });

      const data = await response.json();

      if (data.verified) {
        setStatus('verified');
        setStatusMessage('Deposit verified! Balance updated.');
      } else {
        setStatus('failed');
        setStatusMessage(`Verification failed: ${data.reason || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('failed');
      setStatusMessage('Error contacting verification server');
    }
  };

  const handleSimulate = async () => {
    setStatus('checking');
    setStatusMessage('Simulating deposit...');
    
    // Generate random mock hash
    const mockHash = `0x_SIMULATED_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    setTxHash(mockHash); // Fill the input for user to see

    try {
      const response = await fetch('/api/verify-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          amount,
          txHash: mockHash,
          symbol: selectedAsset,
          network: selectedNetwork,
          senderAddress: address || '0xSimulatedUser', 
          simulate: true,
        }),
      });

      const data = await response.json();

      if (data.verified) {
        setStatus('verified');
        setStatusMessage('Simulation Successful! Balance updated.');
      } else {
        setStatus('failed');
        setStatusMessage(`Simulation failed: ${data.reason}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('failed');
    }
  };

  if (!user) {
    return <div className="p-8 text-center">Please log in to make a deposit.</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Deposit Crypto</h1>
      
      {/* Wallet Connection */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Your Wallet</span>
          {isConnected ? (
            <button 
              onClick={() => disconnect()}
              className="text-xs text-red-500 hover:underline"
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={() => connect({ connector: injected() })}
              className="text-xs text-blue-500 hover:underline"
            >
              Connect (Trust Wallet / MetaMask)
            </button>
          )}
        </div>
        <div className="text-sm font-mono truncate">
          {isConnected ? address : 'Not connected'}
        </div>
        <p className="text-xs text-gray-400 mt-2">
           Make sure your wallet is connected to <strong>{selectedNetwork === 'BSC' ? 'BSC Testnet' : 'Ethereum Mainnet'}</strong>.
        </p>
      </div>

      {/* Network Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">1. Select Network</label>
        <div className="grid grid-cols-2 gap-2">
          {(['BSC', 'ETH'] as const).map((net) => (
            <button
              key={net}
              onClick={() => {
                setSelectedNetwork(net);
                setSelectedAsset(net === 'BSC' ? 'BNB' : 'ETH'); // Reset asset default
              }}
              className={`py-3 px-4 rounded-lg border text-sm font-bold transition-colors
                ${selectedNetwork === net
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              {net === 'BSC' ? 'BSC Testnet (BEP20)' : 'Ethereum (ERC20)'}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">2. Select Asset</label>
        <div className="grid grid-cols-3 gap-2">
          {availableAssets.map((asset) => (
            <button
              key={asset}
              onClick={() => setSelectedAsset(asset)}
              className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors
                ${selectedAsset === asset 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              {asset}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Sender Address (Optional) */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Sender Wallet Address (Optional)</label>
        <p className="text-xs text-gray-500 mb-2">If you sent funds from an exchange or a different wallet, paste the address here.</p>
        <input 
          type="text" 
          value={inputSenderAddress}
          onChange={(e) => setInputSenderAddress(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
          placeholder={address || "0x..."}
        />
      </div>

      {/* Deposit Info */}
      <div className="mb-8 text-center pt-4">
        <p className="text-sm text-gray-500 mb-2">
          Send <strong>{selectedAsset}</strong> ({selectedNetwork === 'BSC' ? 'BEP20' : 'ERC20'}) to this address:
        </p>
        <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded font-mono text-xs break-all select-all cursor-pointer"
             onClick={() => navigator.clipboard.writeText(centralWallet)}>
          {centralWallet}
        </div>
        
        <div className="flex justify-center my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=200x200`} 
            alt="Deposit QR Code"
            className="rounded-lg border-4 border-white shadow-sm"
          />
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Amount to Deposit ({selectedAsset})</label>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          placeholder="0.1"
          step="0.01"
        />
      </div>

      {/* Verification Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
        <h3 className="font-medium mb-3">Verify Transaction</h3>
        <p className="text-xs text-gray-500 mb-3">After sending, paste the transaction hash (Tx ID) here to update your balance immediately.</p>
        
        <input 
          type="text" 
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-3 font-mono text-sm"
          placeholder="0x..."
        />
        
        <button 
          onClick={handleVerify}
          disabled={status === 'checking'}
          className={`w-full py-2 px-4 rounded font-medium text-white transition-colors
            ${status === 'verified' ? 'bg-green-600 hover:bg-green-700' : 
              status === 'failed' ? 'bg-red-600 hover:bg-red-700' : 
              'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'}`}
        >
          {status === 'checking' ? 'Verifying...' : 
           status === 'verified' ? 'Verified Successfully' : 'Verify Deposit'}
        </button>
        
        {statusMessage && (
          <p className={`mt-3 text-sm text-center ${
            status === 'verified' ? 'text-green-500' : 
            status === 'failed' ? 'text-red-500' : 'text-gray-500'
          }`}>
            {statusMessage}
          </p>
        )}

        {/* Testnet Tools */}
        <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Development Tools</p>
          
          <div className="grid grid-cols-2 gap-3">
             <a 
               href="https://testnet.bnbchain.org/faucet-smart" 
               target="_blank" 
               rel="noopener noreferrer"
               className="block text-center py-2 px-3 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-blue-600 dark:text-blue-400 font-medium"
             >
               Get Testnet BNB ↗
             </a>
             <button
               onClick={handleSimulate}
               disabled={status === 'checking'}
               className="text-center py-2 px-3 text-xs bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded text-yellow-700 dark:text-yellow-500 font-medium"
             >
               ⚡ Simulate Deposit
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

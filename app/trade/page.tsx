'use client';

import { useState, useEffect } from 'react';
import AccountBalance from '../components/AccountBalance';
import TradeForm from '../components/TradeForm';
import CryptoCard from '../components/CryptoCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

export default function TradePage() {
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [cryptoList, setCryptoList] = useState<CryptoData[]>([]);

  useEffect(() => {
    const mockData: CryptoData[] = [
      { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change24h: 2.45 },
      { symbol: 'ETH', name: 'Ethereum', price: 2650.00, change24h: -1.23 },
      { symbol: 'BNB', name: 'Binance Coin', price: 315.50, change24h: 0.87 },
      { symbol: 'SOL', name: 'Solana', price: 98.75, change24h: 5.12 },
      { symbol: 'ADA', name: 'Cardano', price: 0.52, change24h: -0.45 },
      { symbol: 'XRP', name: 'Ripple', price: 0.62, change24h: 1.89 },
    ];
    setCryptoList(mockData);
    setSelectedCrypto(mockData[0]);
  }, []);

  useEffect(() => {
    // Fetch account balance
    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/account/balance');
        if (response.ok) {
          const data = await response.json();
          setAccountBalance(data.balance || 0);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTrade = async (type: 'buy' | 'sell', amount: number) => {
    if (!selectedCrypto) {
      alert('Please select a cryptocurrency');
      return;
    }

    const totalCost = amount * selectedCrypto.price;

    if (type === 'buy' && totalCost > accountBalance) {
      alert('Insufficient balance. Please deposit funds first.');
      return;
    }

    // In a real app, this would execute the trade via API
    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          symbol: selectedCrypto.symbol,
          amount,
          price: selectedCrypto.price,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${type === 'buy' ? 'Buy' : 'Sell'} order executed successfully!`);
        // Refresh balance
        const balanceResponse = await fetch('/api/account/balance');
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setAccountBalance(balanceData.balance || 0);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Trade failed. Please try again.');
      }
    } catch (error) {
      console.error('Trade error:', error);
      alert('Trade failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Trade
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Buy and sell cryptocurrencies
              </p>
            </div>
          </div>
          <AccountBalance />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Crypto Selection */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Cryptocurrency
            </h2>
            <div className="space-y-3">
              {cryptoList.map((crypto) => (
                <button
                  key={crypto.symbol}
                  onClick={() => setSelectedCrypto(crypto)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedCrypto?.symbol === crypto.symbol
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {crypto.symbol}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {crypto.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${crypto.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm ${
                        crypto.change24h >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trading Form */}
          <div className="lg:col-span-2">
            {selectedCrypto && (
              <>
                <div className="mb-4">
                  <CryptoCard
                    symbol={selectedCrypto.symbol}
                    name={selectedCrypto.name}
                    price={selectedCrypto.price}
                    change24h={selectedCrypto.change24h}
                  />
                </div>
                <TradeForm
                  symbol={selectedCrypto.symbol}
                  price={selectedCrypto.price}
                  onTrade={handleTrade}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


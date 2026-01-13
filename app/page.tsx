'use client';

import { useState, useEffect } from 'react';
import AccountBalance from './components/AccountBalance';
import PortfolioCard from './components/PortfolioCard';
import CryptoCard from './components/CryptoCard';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

export default function Home() {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(12500.00);
  const [portfolioChange, setPortfolioChange] = useState(250.00);
  const [portfolioChangePercent, setPortfolioChangePercent] = useState(2.04);

  useEffect(() => {
    // Simulate fetching crypto data
    const fetchCryptoData = async () => {
      // In a real app, this would fetch from an API
      const mockData: CryptoData[] = [
        { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change24h: 2.45 },
        { symbol: 'ETH', name: 'Ethereum', price: 2650.00, change24h: -1.23 },
        { symbol: 'BNB', name: 'Binance Coin', price: 315.50, change24h: 0.87 },
        { symbol: 'SOL', name: 'Solana', price: 98.75, change24h: 5.12 },
        { symbol: 'ADA', name: 'Cardano', price: 0.52, change24h: -0.45 },
        { symbol: 'XRP', name: 'Ripple', price: 0.62, change24h: 1.89 },
      ];
      setCryptoData(mockData);
    };

    fetchCryptoData();
    // Simulate real-time updates
    const interval = setInterval(() => {
      setCryptoData(prev => prev.map(crypto => ({
        ...crypto,
        price: crypto.price * (1 + (Math.random() - 0.5) * 0.02),
        change24h: crypto.change24h + (Math.random() - 0.5) * 0.5,
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your crypto investments
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <AccountBalance />
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="mb-6">
          <PortfolioCard 
            totalValue={portfolioValue}
            totalChange={portfolioChange}
            totalChangePercent={portfolioChangePercent}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link
            href="/trade"
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quick Trade</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Buy/Sell</p>
            </div>
            <ArrowRight className="text-blue-600 dark:text-blue-400" size={20} />
          </Link>
          <Link
            href="/portfolio"
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">View Portfolio</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Holdings</p>
            </div>
            <ArrowRight className="text-blue-600 dark:text-blue-400" size={20} />
          </Link>
        </div>

        {/* Market Overview */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Market Overview
            </h2>
            <Link
              href="/markets"
              className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cryptoData.map((crypto) => (
              <CryptoCard
                key={crypto.symbol}
                symbol={crypto.symbol}
                name={crypto.name}
                price={crypto.price}
                change24h={crypto.change24h}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

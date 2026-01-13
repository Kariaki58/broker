'use client';

import { useState, useEffect } from 'react';
import CryptoCard from '../components/CryptoCard';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

export default function MarketsPage() {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const mockData: CryptoData[] = [
      { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change24h: 2.45, volume24h: 28500000000, marketCap: 850000000000 },
      { symbol: 'ETH', name: 'Ethereum', price: 2650.00, change24h: -1.23, volume24h: 12000000000, marketCap: 318000000000 },
      { symbol: 'BNB', name: 'Binance Coin', price: 315.50, change24h: 0.87, volume24h: 1500000000, marketCap: 47300000000 },
      { symbol: 'SOL', name: 'Solana', price: 98.75, change24h: 5.12, volume24h: 2800000000, marketCap: 45000000000 },
      { symbol: 'ADA', name: 'Cardano', price: 0.52, change24h: -0.45, volume24h: 450000000, marketCap: 18500000000 },
      { symbol: 'XRP', name: 'Ripple', price: 0.62, change24h: 1.89, volume24h: 1200000000, marketCap: 34000000000 },
      { symbol: 'DOT', name: 'Polkadot', price: 7.25, change24h: 3.21, volume24h: 320000000, marketCap: 9500000000 },
      { symbol: 'MATIC', name: 'Polygon', price: 0.85, change24h: -2.15, volume24h: 580000000, marketCap: 8200000000 },
      { symbol: 'AVAX', name: 'Avalanche', price: 36.50, change24h: 4.67, volume24h: 650000000, marketCap: 14000000000 },
      { symbol: 'LINK', name: 'Chainlink', price: 14.25, change24h: 1.45, volume24h: 420000000, marketCap: 8500000000 },
    ];
    setCryptoData(mockData);

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

  const filteredData = cryptoData.filter(crypto =>
    crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crypto.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Markets
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Explore cryptocurrency markets
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search cryptocurrencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Market List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No cryptocurrencies found matching your search.
              </p>
            </div>
          ) : (
            filteredData.map((crypto) => (
              <CryptoCard
                key={crypto.symbol}
                symbol={crypto.symbol}
                name={crypto.name}
                price={crypto.price}
                change24h={crypto.change24h}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}


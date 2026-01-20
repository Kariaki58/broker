'use client';

import { useState } from 'react';
import { Home, Cpu, Users, BarChart3, ArrowDownCircle, LogIn, LogOut, UserPlus, Receipt } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/authContext';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();

  const navItems = isAuthenticated
    ? [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/mining', icon: Cpu, label: 'Mining' },
        { href: '/referral', icon: Users, label: 'Referral' },
        { href: '/markets', icon: BarChart3, label: 'Markets' },
        { href: '/transactions', icon: Receipt, label: 'Transactions' },
      ]
    : [];

  return (
    <>
      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
          {isAuthenticated ? (
            <button
              onClick={logout}
              className="flex flex-col items-center justify-center flex-1 h-full transition-colors text-gray-500 dark:text-gray-400"
            >
              <LogOut size={20} />
              <span className="text-xs mt-1">Logout</span>
            </button>
          ) : (
            <Link
              href="/login"
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                pathname === '/login'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <LogIn size={20} />
              <span className="text-xs mt-1">Login</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex md:flex-col md:w-64 md:fixed md:left-0 md:top-0 md:h-screen md:bg-white dark:md:bg-gray-900 md:border-r md:border-gray-200 dark:md:border-gray-800 md:p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            CryptoBroker
          </h1>
        </div>
        <div className="flex flex-col space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Auth buttons for desktop */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-2"
                >
                  <LogIn size={20} />
                  <span className="font-medium">Login</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <UserPlus size={20} />
                  <span className="font-medium">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}


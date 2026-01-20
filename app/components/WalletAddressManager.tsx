'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Star, StarOff, Edit2, X, Check } from 'lucide-react';
import { useAuth } from '@/app/lib/authContext';

interface WalletAddress {
  id: string;
  wallet_address: string;
  label: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export default function WalletAddressManager() {
  const { user, isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wallet-addresses', {
        headers: {
          'x-session-token': localStorage.getItem('sessionToken') || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.trim()) return;

    try {
      setAdding(true);
      const response = await fetch('/api/wallet-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('sessionToken') || '',
        },
        body: JSON.stringify({
          walletAddress: newAddress.trim(),
          label: newLabel.trim() || null,
        }),
      });

      if (response.ok) {
        setNewAddress('');
        setNewLabel('');
        setShowAddForm(false);
        fetchAddresses();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add wallet address');
      }
    } catch (error) {
      console.error('Error adding address:', error);
      alert('Failed to add wallet address');
    } finally {
      setAdding(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await fetch(`/api/wallet-addresses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('sessionToken') || '',
        },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (response.ok) {
        fetchAddresses();
      }
    } catch (error) {
      console.error('Error setting primary:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this wallet address?')) return;

    try {
      const response = await fetch(`/api/wallet-addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'x-session-token': localStorage.getItem('sessionToken') || '',
        },
      });

      if (response.ok) {
        fetchAddresses();
      }
    } catch (error) {
      console.error('Error deleting address:', error);
    }
  };

  const handleEditLabel = async (id: string) => {
    try {
      const response = await fetch(`/api/wallet-addresses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('sessionToken') || '',
        },
        body: JSON.stringify({ label: editLabel.trim() || null }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditLabel('');
        fetchAddresses();
      }
    } catch (error) {
      console.error('Error updating label:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
          My Wallet Addresses
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Address</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wallet Address *
            </label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 text-xs md:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Label (Optional)
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g., My Main Wallet"
              className="w-full px-3 py-2 text-xs md:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddAddress}
              disabled={adding || !newAddress.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Address'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewAddress('');
                setNewLabel('');
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs md:text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Loading addresses...</p>
      ) : addresses.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
            No wallet addresses added yet. Add one to start receiving deposits.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border ${
                address.is_primary
                  ? 'border-blue-500 dark:border-blue-500'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex-1 min-w-0">
                {editingId === address.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label"
                      className="flex-1 px-2 py-1 text-xs md:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditLabel(address.id)}
                      className="p-1 text-green-600 hover:text-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditLabel('');
                      }}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {address.is_primary && (
                        <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
                      )}
                      <span className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                        {address.label || 'Unnamed Wallet'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                      {formatAddress(address.wallet_address)}
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!address.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(address.id)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Set as primary"
                  >
                    <StarOff className="w-4 h-4" />
                  </button>
                )}
                {editingId !== address.id && (
                  <button
                    onClick={() => {
                      setEditingId(address.id);
                      setEditLabel(address.label || '');
                    }}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit label"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(address.id)}
                  className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Remove address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


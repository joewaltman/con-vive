'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  gender: string | null;
  priority: number | null;
}

interface GuestSearchProps {
  dinnerId: string;
  onInvite: (guestIds: number[]) => Promise<void>;
  isSending: boolean;
}

export default function GuestSearch({ dinnerId, onInvite, isSending }: GuestSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<SearchResult | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search when query changes
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/admin/guests/search?q=${encodeURIComponent(query)}&dinnerId=${dinnerId}`
        );
        const data = await response.json();
        setResults(data.guests || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, dinnerId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectGuest = (guest: SearchResult) => {
    setSelectedGuest(guest);
    setQuery(`${guest.firstName} ${guest.lastName}`);
    setShowDropdown(false);
  };

  const handleInvite = async () => {
    if (!selectedGuest) return;

    await onInvite([selectedGuest.id]);
    setSelectedGuest(null);
    setQuery('');
    setResults([]);
  };

  const handleClear = () => {
    setSelectedGuest(null);
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Invite Any Guest</h3>

      <div className="flex gap-3">
        <div className="relative flex-1" ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedGuest(null);
            }}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search by name or email..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracotta focus:border-terracotta text-sm"
          />

          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-terracotta rounded-full animate-spin" />
            </div>
          )}

          {/* Search results dropdown */}
          {showDropdown && results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {results.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => handleSelectGuest(guest)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        {guest.firstName} {guest.lastName}
                      </span>
                      {guest.priority && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          guest.priority === 1 ? 'bg-green-100 text-green-700' :
                          guest.priority === 2 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          P{guest.priority}
                        </span>
                      )}
                    </div>
                    {guest.gender && (
                      <span className="text-xs text-gray-500">{guest.gender}</span>
                    )}
                  </div>
                  {guest.email && (
                    <div className="text-xs text-gray-500">{guest.email}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {showDropdown && query.length >= 2 && results.length === 0 && !isSearching && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
              <p className="text-sm text-gray-500">No guests found</p>
            </div>
          )}
        </div>

        {selectedGuest ? (
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
            <button
              onClick={handleInvite}
              disabled={isSending}
              className="px-4 py-2 bg-terracotta text-white text-sm font-medium rounded-lg hover:bg-terracotta/90 disabled:opacity-50"
            >
              {isSending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-400 py-2 px-3">
            Search to invite
          </div>
        )}
      </div>
    </div>
  );
}

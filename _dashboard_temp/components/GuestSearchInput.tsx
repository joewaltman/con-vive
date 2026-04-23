'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Guest } from '@/lib/types';

interface GuestSearchInputProps {
  value: Guest | null;
  onChange: (guest: Guest | null) => void;
  placeholder?: string;
}

export default function GuestSearchInput({ value, onChange, placeholder = 'Search for guest...' }: GuestSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Guest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search guests
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchGuests = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/hosts/search-guests?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error('Error searching guests:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchGuests, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((guest: Guest) => {
    onChange(guest);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery('');
    setResults([]);
  }, [onChange]);

  const displayValue = value
    ? `${value.fields['First Name'] || ''} ${value.fields['Last Name'] || ''}`.trim()
    : '';

  if (value) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-300 rounded-lg">
        <span className="flex-1 text-sm text-gray-900">{displayValue}</span>
        <button
          type="button"
          onClick={handleClear}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => query.length >= 2 && setShowDropdown(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
      />

      {showDropdown && (query.length >= 2 || isSearching) && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {isSearching ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              No guests found
            </div>
          ) : (
            results.map((guest) => (
              <button
                key={guest.id}
                type="button"
                onClick={() => handleSelect(guest)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {guest.fields['First Name']} {guest.fields['Last Name']}
                </div>
                {guest.fields['Email'] && (
                  <div className="text-xs text-gray-500">{guest.fields['Email']}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

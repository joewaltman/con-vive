'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import GuestCard from './GuestCard';
import FilterBar from './FilterBar';
import type { Guest } from '@/lib/types';

interface GuestListProps {
  selectedId: string | null;
  onSelect: (guest: Guest) => void;
  onGuestsLoaded?: (guests: Guest[]) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useMemo(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function GuestList({ selectedId, onSelect, onGuestsLoaded }: GuestListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);

  const { data, error, isLoading } = useSWR<{ guests: Guest[] }>('/api/guests', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    onSuccess: (data) => {
      if (onGuestsLoaded && data?.guests) {
        onGuestsLoaded(data.guests);
      }
    },
  });

  const debouncedSearch = useDebounce(searchQuery, 300);

  const guests = data?.guests || [];

  const filteredGuests = useMemo(() => {
    let filtered = guests;

    // Filter by funnel stage
    if (selectedStages.length > 0) {
      filtered = filtered.filter(guest =>
        selectedStages.includes(guest.fields['Funnel Stage'] || '')
      );
    }

    // Filter by search query
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(guest => {
        const firstName = (guest.fields['First Name'] || '').toLowerCase();
        const lastName = (guest.fields['Last Name'] || '').toLowerCase();
        const email = (guest.fields['Email'] || '').toLowerCase();
        return firstName.includes(query) ||
               lastName.includes(query) ||
               email.includes(query);
      });
    }

    return filtered;
  }, [guests, selectedStages, debouncedSearch]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleStagesChange = useCallback((stages: string[]) => {
    setSelectedStages(stages);
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="h-8 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-3 border-b border-gray-100">
              <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading guests</p>
          <p className="text-sm mt-1">{error.message || 'Please try again'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedStages={selectedStages}
        onStagesChange={handleStagesChange}
        totalCount={guests.length}
        filteredCount={filteredGuests.length}
      />

      <div className="flex-1 overflow-y-auto">
        {filteredGuests.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No guests found</p>
            {(selectedStages.length > 0 || searchQuery) && (
              <p className="text-sm mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          filteredGuests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              selected={guest.id === selectedId}
              onClick={() => onSelect(guest)}
            />
          ))
        )}
      </div>
    </div>
  );
}

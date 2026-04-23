'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import HostCard from './HostCard';
import type { Host } from '@/lib/types';

interface HostListProps {
  selectedId: string | null;
  onSelect: (host: Host) => void;
  onHostsLoaded?: (hosts: Host[]) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HostList({ selectedId, onSelect, onHostsLoaded }: HostListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data, error, isLoading } = useSWR<Host[]>('/api/hosts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    onSuccess: (data) => {
      if (onHostsLoaded && data) {
        onHostsLoaded(data);
      }
    },
  });

  const hosts = data || [];

  const filteredHosts = useMemo(() => {
    let filtered = hosts;

    // Filter inactive
    if (!showInactive) {
      filtered = filtered.filter(host => host.fields['Active'] !== false);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(host => {
        const firstName = (host.fields['First Name'] || '').toLowerCase();
        const lastName = (host.fields['Last Name'] || '').toLowerCase();
        const city = (host.fields['City'] || '').toLowerCase();
        return firstName.includes(query) ||
               lastName.includes(query) ||
               city.includes(query);
      });
    }

    return filtered;
  }, [hosts, searchQuery, showInactive]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="h-8 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
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
          <p className="font-medium">Error loading hosts</p>
          <p className="text-sm mt-1">{error.message || 'Please try again'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search/Filter */}
      <div className="p-3 border-b border-gray-200 bg-white space-y-2">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search hosts..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {filteredHosts.length} of {hosts.length} hosts
          </span>
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-terracotta focus:ring-terracotta"
            />
            Show inactive
          </label>
        </div>
      </div>

      {/* Host List */}
      <div className="flex-1 overflow-y-auto">
        {filteredHosts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No hosts found</p>
            {searchQuery && (
              <p className="text-sm mt-1">Try adjusting your search</p>
            )}
          </div>
        ) : (
          filteredHosts.map((host) => (
            <HostCard
              key={host.id}
              host={host}
              selected={host.id === selectedId}
              onClick={() => onSelect(host)}
            />
          ))
        )}
      </div>
    </div>
  );
}

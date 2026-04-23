'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import DinnerCard from './DinnerCard';
import type { Dinner } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface DinnerListProps {
  onCreateClick: () => void;
}

export default function DinnerList({ onCreateClick }: DinnerListProps) {
  const router = useRouter();

  const { data: upcomingData, isLoading: loadingUpcoming } = useSWR<{ dinners: Dinner[] }>(
    '/api/dinners?filter=upcoming',
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: pastData, isLoading: loadingPast } = useSWR<{ dinners: Dinner[] }>(
    '/api/dinners?filter=past',
    fetcher,
    { revalidateOnFocus: false }
  );

  const upcomingDinners = useMemo(() => upcomingData?.dinners || [], [upcomingData]);
  const pastDinners = useMemo(() => pastData?.dinners || [], [pastData]);

  const handleDinnerClick = (dinner: Dinner) => {
    router.push(`/dinners/${dinner.id}`);
  };

  if (loadingUpcoming && loadingPast) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dinners</h1>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-terracotta text-white text-sm font-medium rounded-lg hover:bg-terracotta-dark transition-colors"
        >
          + New Dinner
        </button>
      </div>

      {/* Upcoming Dinners */}
      <section>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Upcoming Dinners
          {upcomingDinners.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({upcomingDinners.length})
            </span>
          )}
        </h2>

        {loadingUpcoming ? (
          <div className="grid gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcomingDinners.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No upcoming dinners</p>
            <button
              onClick={onCreateClick}
              className="mt-3 text-sm text-terracotta hover:underline"
            >
              Schedule a new dinner
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {upcomingDinners.map(dinner => (
              <DinnerCard
                key={dinner.id}
                dinner={dinner}
                onClick={() => handleDinnerClick(dinner)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past Dinners */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 mb-4">
          Past Dinners
          {pastDinners.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({pastDinners.length})
            </span>
          )}
        </h2>

        {loadingPast ? (
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : pastDinners.length === 0 ? (
          <p className="text-gray-500 text-sm">No past dinners</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {pastDinners.slice(0, 10).map(dinner => (
              <DinnerCard
                key={dinner.id}
                dinner={dinner}
                compact
                onClick={() => handleDinnerClick(dinner)}
              />
            ))}
            {pastDinners.length > 10 && (
              <div className="p-3 text-center text-sm text-gray-500 border-t border-gray-100">
                +{pastDinners.length - 10} more past dinners
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

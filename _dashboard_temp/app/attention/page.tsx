'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Sidebar from '@/components/Sidebar';
import AttentionCard from '@/components/AttentionCard';
import type { AttentionQueueData } from '@/lib/types';
import { COLORS } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AttentionPage() {
  const router = useRouter();

  const { data, error, isLoading, mutate } = useSWR<AttentionQueueData>(
    '/api/attention',
    fetcher,
    {
      refreshInterval: 60000, // Poll every minute
      revalidateOnFocus: false,
    }
  );

  const handleApprove = useCallback(async (guestId: number, message?: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second client timeout

    try {
      const response = await fetch(`/api/guests/${guestId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message || '' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve guest');
      }

      // Revalidate the queue
      mutate();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
  }, [mutate]);

  const handleArchive = useCallback(async (guestId: number) => {
    const response = await fetch(`/api/guests/${guestId}/archive`, {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to archive guest');
    }

    // Revalidate the queue
    mutate();
  }, [mutate]);

  const handleReject = useCallback(async (guestId: number) => {
    const response = await fetch(`/api/guests/${guestId}/reject`, {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to reject guest');
    }

    // Revalidate the queue
    mutate();
  }, [mutate]);

  const handleViewGuest = useCallback((guestId: string) => {
    router.push(`/?guest=${guestId}`);
  }, [router]);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Needs Attention
            </h1>
            {data && (
              <p className="text-gray-600">
                {data.totalCount} {data.totalCount === 1 ? 'guest' : 'guests'} need attention
              </p>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">Failed to load attention queue</div>
            </div>
          )}

          {/* Empty State */}
          {data && data.totalCount === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${COLORS.terracotta}20` }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: COLORS.terracotta }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">All caught up!</p>
              <p className="text-gray-500">No guests need attention right now.</p>
            </div>
          )}

          {/* Attention Queue List */}
          {data && data.totalCount > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.items.map((item) => (
                <AttentionCard
                  key={item.guest.id}
                  item={item}
                  onApprove={handleApprove}
                  onArchive={handleArchive}
                  onReject={handleReject}
                  onViewGuest={handleViewGuest}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

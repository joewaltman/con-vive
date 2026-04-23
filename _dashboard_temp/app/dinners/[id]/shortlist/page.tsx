'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Sidebar from '@/components/Sidebar';
import ShortlistTable from '@/components/ShortlistTable';
import Toast from '@/components/Toast';
import type { ShortlistGuest } from '@/lib/types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface EligibleGuestsResponse {
  guests: ShortlistGuest[];
  dinnerInfo: {
    id: string;
    name: string;
    date: string;
    dayOfWeek: string;
    totalSeats: number;
    minPerGender: number;
    dinnerType: string;
  };
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ShortlistPage() {
  const router = useRouter();
  const params = useParams();
  const dinnerId = params.id as string;

  const [excludeDietary, setExcludeDietary] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Build API URL with dietary exclusions
  const apiUrl = `/api/dinners/${dinnerId}/eligible-guests${
    excludeDietary.length > 0 ? `?excludeDietary=${excludeDietary.join(',')}` : ''
  }`;

  const { data, error, isLoading } = useSWR<EligibleGuestsResponse>(
    dinnerId ? apiUrl : null,
    fetcher
  );

  const handleSendInvites = useCallback(async (guestIds: number[]) => {
    setIsSending(true);
    try {
      const response = await fetch(`/api/dinners/${dinnerId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invites');
      }

      // Show success message
      const failedCount = result.failed?.length || 0;
      if (failedCount > 0) {
        setToast({
          message: `Sent ${result.sent} invite${result.sent !== 1 ? 's' : ''}, ${failedCount} failed`,
          type: 'warning' as 'error',
        });
      } else {
        setToast({
          message: `Successfully sent ${result.sent} invite${result.sent !== 1 ? 's' : ''}`,
          type: 'success',
        });
      }

      // Refresh the guest list
      mutate(apiUrl);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to send invites',
        type: 'error',
      });
    } finally {
      setIsSending(false);
    }
  }, [dinnerId, apiUrl]);

  if (isLoading) {
    return (
      <div className="h-screen flex overflow-hidden bg-cream">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex overflow-hidden bg-cream">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Error loading shortlist</p>
            <button
              onClick={() => router.push(`/dinners/${dinnerId}`)}
              className="mt-4 text-terracotta hover:underline"
            >
              Back to dinner
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { guests, dinnerInfo } = data;

  return (
    <div className="h-screen flex overflow-hidden bg-cream">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/dinners/${dinnerId}`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dinner
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Invite Guests
              </h1>
              <p className="text-gray-600 mt-1">
                {dinnerInfo.name} - {dinnerInfo.dayOfWeek}, {dinnerInfo.date}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {guests.length} eligible guest{guests.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Shortlist Table */}
        <ShortlistTable
          guests={guests}
          dinnerDayOfWeek={dinnerInfo.dayOfWeek}
          totalSeats={dinnerInfo.totalSeats}
          minPerGender={dinnerInfo.minPerGender}
          onSendInvites={handleSendInvites}
          isSending={isSending}
          excludeDietary={excludeDietary}
          onExcludeDietaryChange={setExcludeDietary}
        />
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

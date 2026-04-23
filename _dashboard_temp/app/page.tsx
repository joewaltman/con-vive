'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mutate } from 'swr';
import Sidebar from '@/components/Sidebar';
import GuestList from '@/components/GuestList';
import GuestDetail from '@/components/GuestDetail';
import Toast from '@/components/Toast';
import type { Guest, GuestFields } from '@/lib/types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const guestIdFromUrl = searchParams.get('guest');

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Auto-select guest from URL parameter when guests are loaded
  useEffect(() => {
    if (guestIdFromUrl && allGuests.length > 0 && !selectedGuest) {
      const guest = allGuests.find(g => g.id === guestIdFromUrl);
      if (guest) {
        setSelectedGuest(guest);
        setMobileShowDetail(true);
      }
    }
  }, [guestIdFromUrl, allGuests, selectedGuest]);

  const handleGuestSelect = useCallback((guest: Guest) => {
    setSelectedGuest(guest);
    setMobileShowDetail(true);
  }, []);

  const handleGuestsLoaded = useCallback((guests: Guest[]) => {
    setAllGuests(guests);
    // If we have a selected guest, update it with fresh data
    if (selectedGuest) {
      const updated = guests.find(g => g.id === selectedGuest.id);
      if (updated) {
        setSelectedGuest(updated);
      }
    }
  }, [selectedGuest]);

  const handleSave = async (id: string, fields: Partial<GuestFields>) => {
    try {
      const response = await fetch(`/api/guests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      const updatedGuest = await response.json();

      // Update local state
      setSelectedGuest(updatedGuest);
      setAllGuests(prev => prev.map(g => g.id === id ? updatedGuest : g));

      // Revalidate SWR cache
      mutate('/api/guests');

      setToast({ message: 'Changes saved successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to save changes',
        type: 'error',
      });
      throw error;
    }
  };

  const handleBack = useCallback(() => {
    setMobileShowDetail(false);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-cream">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        {/* Guest List */}
        <div
          className={`
            w-full md:w-[350px] md:shrink-0 border-r border-gray-200 bg-white
            ${mobileShowDetail ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
          `}
        >
          <GuestList
            selectedId={selectedGuest?.id || null}
            onSelect={handleGuestSelect}
            onGuestsLoaded={handleGuestsLoaded}
          />
        </div>

        {/* Detail Panel */}
        <div
          className={`
            flex-1 bg-cream overflow-hidden
            ${mobileShowDetail ? 'flex flex-col' : 'hidden md:flex md:flex-col'}
          `}
        >
          {selectedGuest ? (
            <GuestDetail
              guest={selectedGuest}
              onSave={handleSave}
              onBack={handleBack}
              showBackButton={mobileShowDetail}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg">Select a guest</p>
                <p className="text-sm mt-1">Choose a guest from the list to view details</p>
              </div>
            </div>
          )}
        </div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

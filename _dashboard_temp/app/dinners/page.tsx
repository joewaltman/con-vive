'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import Sidebar from '@/components/Sidebar';
import DinnerList from '@/components/DinnerList';
import DinnerCreateModal from '@/components/DinnerCreateModal';
import Toast from '@/components/Toast';
import type { DinnerFields } from '@/lib/types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

function DinnersContent() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleCreate = async (fields: Partial<DinnerFields>) => {
    try {
      const response = await fetch('/api/dinners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dinner');
      }

      const newDinner = await response.json();

      // Revalidate caches
      mutate('/api/dinners?filter=upcoming');
      mutate('/api/dinners?filter=past');

      setToast({ message: 'Dinner created successfully', type: 'success' });

      // Navigate to the new dinner
      router.push(`/dinners/${newDinner.id}`);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to create dinner',
        type: 'error',
      });
      throw error;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-cream">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <DinnerList onCreateClick={() => setShowCreateModal(true)} />
      </main>

      <DinnerCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

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

export default function DinnersPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <DinnersContent />
    </Suspense>
  );
}

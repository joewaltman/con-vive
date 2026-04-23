'use client';

import { useState, useCallback, Suspense } from 'react';
import { mutate } from 'swr';
import Sidebar from '@/components/Sidebar';
import HostList from '@/components/HostList';
import HostDetail from '@/components/HostDetail';
import HostCreateModal from '@/components/HostCreateModal';
import Toast from '@/components/Toast';
import type { Host, HostFields } from '@/lib/types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

function HostsContent() {
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [allHosts, setAllHosts] = useState<Host[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleHostSelect = useCallback((host: Host) => {
    setSelectedHost(host);
    setMobileShowDetail(true);
  }, []);

  const handleHostsLoaded = useCallback((hosts: Host[]) => {
    setAllHosts(hosts);
    if (selectedHost) {
      const updated = hosts.find(h => h.id === selectedHost.id);
      if (updated) {
        setSelectedHost(updated);
      }
    }
  }, [selectedHost]);

  const handleSave = async (id: string, fields: Partial<HostFields>) => {
    try {
      const response = await fetch(`/api/hosts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      const updatedHost = await response.json();

      setSelectedHost(updatedHost);
      setAllHosts(prev => prev.map(h => h.id === id ? updatedHost : h));

      mutate('/api/hosts');

      setToast({ message: 'Changes saved successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to save changes',
        type: 'error',
      });
      throw error;
    }
  };

  const handleCreate = async (fields: Partial<HostFields>) => {
    try {
      const response = await fetch('/api/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create host');
      }

      const newHost = await response.json();

      mutate('/api/hosts');

      setSelectedHost(newHost);
      setMobileShowDetail(true);
      setToast({ message: 'Host created successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to create host',
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
        {/* Host List */}
        <div
          className={`
            w-full md:w-[350px] md:shrink-0 border-r border-gray-200 bg-white flex flex-col
            ${mobileShowDetail ? 'hidden md:flex' : 'flex'}
          `}
        >
          {/* Add Host Button */}
          <div className="p-3 border-b border-gray-200 bg-white">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-2 bg-terracotta text-white text-sm font-medium rounded-lg hover:bg-terracotta-dark transition-colors"
            >
              + Add Host
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <HostList
              selectedId={selectedHost?.id || null}
              onSelect={handleHostSelect}
              onHostsLoaded={handleHostsLoaded}
            />
          </div>
        </div>

        {/* Detail Panel */}
        <div
          className={`
            flex-1 bg-cream overflow-hidden
            ${mobileShowDetail ? 'flex flex-col' : 'hidden md:flex md:flex-col'}
          `}
        >
          {selectedHost ? (
            <HostDetail
              host={selectedHost}
              onSave={handleSave}
              onBack={handleBack}
              showBackButton={mobileShowDetail}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg">Select a host</p>
                <p className="text-sm mt-1">Choose a host from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <HostCreateModal
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

export default function HostsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <HostsContent />
    </Suspense>
  );
}

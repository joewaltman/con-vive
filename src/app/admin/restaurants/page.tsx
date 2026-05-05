'use client';

import { useState, useCallback, Suspense } from 'react';
import { mutate } from 'swr';
import Sidebar from '@/components/admin/Sidebar';
import RestaurantList from '@/components/admin/RestaurantList';
import RestaurantDetail from '@/components/admin/RestaurantDetail';
import RestaurantCreateModal from '@/components/admin/RestaurantCreateModal';
import Toast from '@/components/admin/Toast';
import type { Restaurant, RestaurantFields } from '@/lib/types/admin';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

function RestaurantsContent() {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleRestaurantSelect = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setMobileShowDetail(true);
  }, []);

  const handleRestaurantsLoaded = useCallback((restaurants: Restaurant[]) => {
    setAllRestaurants(restaurants);
    if (selectedRestaurant) {
      const updated = restaurants.find(r => r.id === selectedRestaurant.id);
      if (updated) {
        setSelectedRestaurant(updated);
      }
    }
  }, [selectedRestaurant]);

  const handleSave = async (id: string, fields: Partial<RestaurantFields>) => {
    try {
      const response = await fetch(`/api/admin/restaurants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      const updatedRestaurant = await response.json();

      setSelectedRestaurant(updatedRestaurant);
      setAllRestaurants(prev => prev.map(r => r.id === id ? updatedRestaurant : r));

      mutate('/api/admin/restaurants');

      setToast({ message: 'Changes saved successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to save changes',
        type: 'error',
      });
      throw error;
    }
  };

  const handleCreate = async (fields: Partial<RestaurantFields>) => {
    try {
      const response = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create restaurant');
      }

      const newRestaurant = await response.json();

      mutate('/api/admin/restaurants');

      setSelectedRestaurant(newRestaurant);
      setMobileShowDetail(true);
      setToast({ message: 'Restaurant created successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to create restaurant',
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
        {/* Restaurant List */}
        <div
          className={`
            w-full md:w-[350px] md:shrink-0 border-r border-gray-200 bg-white flex flex-col
            ${mobileShowDetail ? 'hidden md:flex' : 'flex'}
          `}
        >
          {/* Add Restaurant Button */}
          <div className="p-3 border-b border-gray-200 bg-white">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-2 bg-terracotta text-white text-sm font-medium rounded-lg hover:bg-terracotta-dark transition-colors"
            >
              + Add Restaurant
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <RestaurantList
              selectedId={selectedRestaurant?.id || null}
              onSelect={handleRestaurantSelect}
              onRestaurantsLoaded={handleRestaurantsLoaded}
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
          {selectedRestaurant ? (
            <RestaurantDetail
              restaurant={selectedRestaurant}
              onSave={handleSave}
              onBack={handleBack}
              showBackButton={mobileShowDetail}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg">Select a restaurant</p>
                <p className="text-sm mt-1">Choose a restaurant from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <RestaurantCreateModal
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

export default function RestaurantsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <RestaurantsContent />
    </Suspense>
  );
}

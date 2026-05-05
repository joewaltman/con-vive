'use client';

import type { Restaurant } from '@/lib/types/admin';

interface RestaurantCardProps {
  restaurant: Restaurant;
  selected: boolean;
  onClick: () => void;
}

export default function RestaurantCard({ restaurant, selected, onClick }: RestaurantCardProps) {
  const name = restaurant.fields['Name'] || '';
  const city = restaurant.fields['City'] || '';
  const address = restaurant.fields['Address'] || '';
  const isActive = restaurant.fields['Active'] !== false;
  const dinnerCount = restaurant.dinnerCount || 0;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 border-b border-gray-100 transition-colors
        ${selected
          ? 'bg-terracotta/10 border-l-2 border-l-terracotta'
          : 'hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">
              {name}
            </span>
            {!isActive && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                Inactive
              </span>
            )}
          </div>
          {city && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{city}</p>
          )}
          {address && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{address}</p>
          )}
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="text-xs text-gray-500">
            {dinnerCount} dinner{dinnerCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </button>
  );
}

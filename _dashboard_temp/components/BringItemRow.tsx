'use client';

import { useState, useCallback } from 'react';
import type { BringItem } from '@/lib/types';

interface BringItemRowProps {
  item: BringItem;
  onDelete: (id: number) => Promise<void>;
}

export default function BringItemRow({ item, onDelete }: BringItemRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const claimedCount = item.claims?.length || 0;
  const remainingSlots = item.slots - claimedCount;

  const handleDeleteClick = useCallback(() => {
    if (claimedCount > 0) {
      setShowConfirm(true);
    } else {
      handleConfirmDelete();
    }
  }, [claimedCount]);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }, [item.id, onDelete]);

  return (
    <div className="flex items-center gap-4 py-2 px-3 bg-gray-50 rounded-lg">
      {/* Category & Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
            {item.category}
          </span>
          {item.description && (
            <span className="text-sm text-gray-600 truncate">{item.description}</span>
          )}
        </div>

        {/* Claims */}
        {item.claims && item.claims.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.claims.map((claim) => (
              <span
                key={claim.id}
                className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded"
              >
                {(claim as unknown as { guestName: string }).guestName || `Guest ${claim.guestId}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Slots */}
      <div className="shrink-0 text-right">
        <div className="text-sm font-medium text-gray-900">
          {claimedCount} / {item.slots}
        </div>
        <div className="text-xs text-gray-500">
          {remainingSlots > 0 ? `${remainingSlots} open` : 'Full'}
        </div>
      </div>

      {/* Delete Button */}
      <div className="shrink-0">
        {showConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? '...' : 'Delete'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete item"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

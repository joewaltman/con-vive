'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Dinner } from '@/lib/types';

interface CancelDinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dinner: Dinner;
  onCancelled: () => void;
}

export default function CancelDinnerModal({
  isOpen,
  onClose,
  dinner,
  onCancelled,
}: CancelDinnerModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate confirmed guests and refund amount
  const stats = useMemo(() => {
    const invitations = dinner.invitations || [];
    const confirmed = invitations.filter(
      i => i.status === 'confirmed' || i.response === 'Accepted'
    );
    const confirmedWithPayment = confirmed.filter(i => i.paymentIntentId);
    const totalRefundCents = confirmedWithPayment.reduce(
      (sum, i) => sum + (i.pricePaidCents || 0),
      0
    );

    return {
      confirmedCount: confirmed.length,
      confirmedWithPaymentCount: confirmedWithPayment.length,
      totalRefundDollars: totalRefundCents / 100,
    };
  }, [dinner.invitations]);

  const dinnerName = dinner.fields['Dinner Name'] || '';
  const isConfirmValid = confirmText === dinnerName;

  const handleCancel = useCallback(async () => {
    if (!isConfirmValid) return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/dinners/${dinner.id}/cancel`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel dinner');
      }

      onCancelled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel dinner');
    } finally {
      setIsCancelling(false);
    }
  }, [dinner.id, isConfirmValid, onCancelled]);

  const handleClose = useCallback(() => {
    if (!isCancelling) {
      setConfirmText('');
      setError(null);
      onClose();
    }
  }, [isCancelling, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-red-600">Cancel Dinner</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> This action cannot be undone.
            </p>
            {stats.confirmedCount > 0 && (
              <p className="text-sm text-amber-800 mt-2">
                <strong>{stats.confirmedCount}</strong> confirmed guest{stats.confirmedCount !== 1 ? 's' : ''} will be notified.
              </p>
            )}
            {stats.confirmedWithPaymentCount > 0 && (
              <p className="text-sm text-amber-800 mt-2">
                <strong>${stats.totalRefundDollars.toFixed(2)}</strong> will be refunded to{' '}
                {stats.confirmedWithPaymentCount} guest{stats.confirmedWithPaymentCount !== 1 ? 's' : ''}.
              </p>
            )}
          </div>

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="font-mono bg-gray-100 px-1">{dinnerName}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={dinnerName}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
              disabled={isCancelling}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isCancelling}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Keep Dinner
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={!isConfirmValid || isCancelling}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Dinner'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import ApproveModal from './ApproveModal';

interface NeedsAttentionBannerProps {
  guestId: string;
  guestName: string;
  onActionComplete?: () => void;
}

export default function NeedsAttentionBanner({ guestId, guestName, onActionComplete }: NeedsAttentionBannerProps) {
  const [needsAttention, setNeedsAttention] = useState<boolean | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [processing, setProcessing] = useState<'approve' | 'archive' | 'reject' | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(`/api/guests/${guestId}/needs-attention`);
        if (response.ok) {
          const data = await response.json();
          setNeedsAttention(data.needsAttention);
        }
      } catch (error) {
        console.error('Error checking attention status:', error);
        setNeedsAttention(false);
      }
    }

    checkStatus();
  }, [guestId]);

  const handleApprove = useCallback(async (message?: string) => {
    console.log('[NeedsAttentionBanner] handleApprove started');
    setProcessing('approve');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second client timeout

    try {
      console.log('[NeedsAttentionBanner] Fetching /api/guests/${guestId}/approve...');
      const response = await fetch(`/api/guests/${guestId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message || '' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[NeedsAttentionBanner] Response received:', response.status);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve guest');
      }

      console.log('[NeedsAttentionBanner] Success, updating state');
      setNeedsAttention(false);
      onActionComplete?.();
      console.log('[NeedsAttentionBanner] handleApprove complete');
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[NeedsAttentionBanner] Error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      setProcessing(null);
    }
  }, [guestId, onActionComplete]);

  const handleArchive = useCallback(async () => {
    setProcessing('archive');
    try {
      const response = await fetch(`/api/guests/${guestId}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive guest');
      }

      setNeedsAttention(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error archiving guest:', error);
    } finally {
      setProcessing(null);
    }
  }, [guestId, onActionComplete]);

  const handleReject = useCallback(async () => {
    setProcessing('reject');
    try {
      const response = await fetch(`/api/guests/${guestId}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject guest');
      }

      setNeedsAttention(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error rejecting guest:', error);
    } finally {
      setProcessing(null);
    }
  }, [guestId, onActionComplete]);

  // Don't render if not needed or still loading
  if (needsAttention === null || needsAttention === false) {
    return null;
  }

  const isProcessing = processing !== null;

  return (
    <>
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-medium text-amber-800">
              This guest needs attention
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowApproveModal(true)}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-white bg-terracotta rounded hover:bg-terracotta-dark disabled:opacity-50 transition-colors"
            >
              Approve
            </button>

            <button
              onClick={handleArchive}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {processing === 'archive' ? 'Archiving...' : 'Archive'}
            </button>

            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {processing === 'reject' ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>

      {showApproveModal && (
        <ApproveModal
          guestId={guestId}
          guestName={guestName}
          onClose={() => setShowApproveModal(false)}
          onSend={handleApprove}
        />
      )}
    </>
  );
}

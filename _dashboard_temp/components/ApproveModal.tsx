'use client';

import { useState, useEffect, useCallback } from 'react';

interface ApproveModalProps {
  guestId: string;
  guestName: string;
  onClose: () => void;
  onSend: (message?: string) => Promise<void>;
}

const CHARACTER_LIMIT = 1600;

export default function ApproveModal({ guestId, guestName, onClose, onSend }: ApproveModalProps) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDraft() {
      try {
        const response = await fetch(`/api/guests/${guestId}/approve`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to generate message');
        }

        const data = await response.json();
        setDraft(data.draft || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate message');
      } finally {
        setLoading(false);
      }
    }

    fetchDraft();
  }, [guestId]);

  const handleSend = useCallback(async () => {
    if (!draft.trim() || sending) return;

    console.log('[ApproveModal] handleSend started');
    setSending(true);
    setError(null);

    try {
      console.log('[ApproveModal] Calling onSend...');
      await onSend(draft.trim());
      console.log('[ApproveModal] onSend completed, closing modal');
      onClose();
    } catch (err) {
      console.error('[ApproveModal] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setSending(false);
    }
  }, [draft, sending, onSend, onClose]);

  const handleApproveOnly = useCallback(async () => {
    if (sending) return;

    setSending(true);
    setError(null);

    try {
      await onSend();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
      setSending(false);
    }
  }, [sending, onSend, onClose]);

  const characterCount = draft.length;
  const isOverLimit = characterCount > CHARACTER_LIMIT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Approve {guestName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and send a welcome message
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-500">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Generating personalized message...</span>
              </div>
            </div>
          ) : (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                className={`
                  w-full px-3 py-2 text-sm border rounded-lg resize-none
                  focus:ring-1 focus:ring-terracotta focus:border-terracotta
                  ${isOverLimit ? 'border-red-400 bg-red-50' : 'border-gray-300'}
                `}
                placeholder="Enter your message..."
              />

              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs ${isOverLimit ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                  {characterCount} / {CHARACTER_LIMIT}
                </span>
                {isOverLimit && (
                  <span className="text-xs text-red-500">
                    Message is too long
                  </span>
                )}
              </div>

              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={handleApproveOnly}
            disabled={loading || sending}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Approving...' : 'Approve without message'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading || sending || !draft.trim() || isOverLimit}
              className="px-4 py-2 text-sm font-medium text-white bg-terracotta rounded-lg hover:bg-terracotta-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

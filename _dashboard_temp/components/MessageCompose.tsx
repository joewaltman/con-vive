'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { COLORS } from '@/lib/constants';
import type { Message } from '@/lib/types';

interface MessageComposeProps {
  guestId: string;
  routingStatus?: string | null;
  onMessageSent?: (message: Message) => void;
  onOptimisticMessage?: (message: Message | null) => void;
}

export default function MessageCompose({
  guestId,
  routingStatus,
  onMessageSent,
  onOptimisticMessage,
}: MessageComposeProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const maxLength = 1600; // SMS character limit

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return;

    // Check if deprioritized and need confirmation
    if (routingStatus === 'deprioritized' && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setShowConfirm(false);
    setError(null);
    setSending(true);

    // Create optimistic message
    const optimistic: Message = {
      id: Date.now(), // Temporary ID
      guest_id: parseInt(guestId, 10),
      direction: 'outbound',
      body: message.trim(),
      sent_at: new Date().toISOString(),
      delivered: false,
      message_type: 'manual',
      sequence_step: null,
      flagged: false,
      flagged_reason: null,
    };

    onOptimisticMessage?.(optimistic);

    try {
      const response = await fetch(`/api/guests/${guestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const sentMessage = await response.json();
      setMessage('');
      onOptimisticMessage?.(null);
      onMessageSent?.(sentMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      onOptimisticMessage?.(null);
    } finally {
      setSending(false);
    }
  }, [message, sending, guestId, routingStatus, showConfirm, onMessageSent, onOptimisticMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <div className="space-y-2">
      {showConfirm && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 mb-2">
            This guest is deprioritized. Are you sure you want to send a message?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              className="px-3 py-1 text-sm text-white rounded"
              style={{ backgroundColor: COLORS.terracotta }}
            >
              Send Anyway
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending}
          rows={1}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta disabled:bg-gray-100 disabled:text-gray-500"
          style={{
            minHeight: '40px',
            maxHeight: '96px', // 3 lines max
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs ${message.length > maxLength * 0.9 ? 'text-amber-600' : 'text-gray-500'}`}>
          {message.length}/{maxLength}
        </span>

        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: COLORS.terracotta }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Press Cmd+Enter to send
      </p>
    </div>
  );
}

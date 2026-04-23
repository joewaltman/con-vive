'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import type { Message } from '@/lib/types';
import { COLORS } from '@/lib/constants';

interface MessageThreadProps {
  guestId: string;
  optimisticMessage?: Message | null;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function getMessageTypeLabel(message: Message): string | null {
  if (message.direction === 'inbound') return null;

  if (message.message_type === 'manual') {
    return 'Manual';
  }
  if (message.message_type === 'recovery') {
    return 'Recovery';
  }
  if (message.message_type === 'inbound') {
    return null;
  }
  // Sequence messages (null message_type with sequence_step)
  if (message.sequence_step != null) {
    return `Sequence - Step ${message.sequence_step}`;
  }
  return null;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "EEE MMM d, h:mmaaa");
}

export default function MessageThread({ guestId, optimisticMessage }: MessageThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR<{ messages: Message[] }>(
    `/api/guests/${guestId}/messages`,
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: false,
    }
  );

  const messages = data?.messages ?? [];

  // Combine with optimistic message if present and not yet in the list
  const allMessages = optimisticMessage && !messages.find(m => m.id === optimisticMessage.id)
    ? [...messages, optimisticMessage]
    : messages;

  // Auto-scroll to bottom on load and when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        Loading messages...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center text-red-500">
        Failed to load messages
      </div>
    );
  }

  if (allMessages.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No messages yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-80 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg"
    >
      {allMessages.map((message) => {
        const isOutbound = message.direction === 'outbound';
        const typeLabel = getMessageTypeLabel(message);

        return (
          <div
            key={message.id}
            className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                isOutbound
                  ? 'text-white'
                  : 'border border-gray-200'
              }`}
              style={{
                backgroundColor: isOutbound ? COLORS.terracotta : COLORS.cream,
                color: isOutbound ? 'white' : '#1F2937',
              }}
            >
              {typeLabel && (
                <div className={`text-xs mb-1 ${isOutbound ? 'text-white/70' : 'text-gray-500'}`}>
                  {typeLabel}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.body}
              </p>
              <div className={`text-xs mt-1 flex items-center gap-2 ${
                isOutbound ? 'text-white/70' : 'text-gray-500'
              }`}>
                <span>{formatTimestamp(message.sent_at)}</span>
                {isOutbound && !message.delivered && (
                  <span className="italic">Sending...</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

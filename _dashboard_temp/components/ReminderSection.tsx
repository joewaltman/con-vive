'use client';

import { useState } from 'react';
import type { GuestReminder, ReminderResponse } from '@/lib/types';

interface ReminderSectionProps {
  dinnerId: string;
  hasAcceptedGuests: boolean;
}

function ReminderCard({
  reminder,
  onCopy,
}: {
  reminder: GuestReminder;
  onCopy: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(reminder.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{reminder.guestName}</span>
          {reminder.phone && (
            <span className="text-xs text-gray-500">{reminder.phone}</span>
          )}
          {reminder.bringItem && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
              {reminder.bringItem}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="text-sm text-terracotta hover:text-terracotta-dark transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
        {reminder.message}
      </pre>
    </div>
  );
}

export default function ReminderSection({
  dinnerId,
  hasAcceptedGuests,
}: ReminderSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<GuestReminder[] | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dinners/${dinnerId}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate reminders');
      }

      const data: ReminderResponse = await response.json();
      setReminders(data.reminders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate reminders');
    } finally {
      setLoading(false);
    }
  };

  const copySingle = (message: string) => {
    navigator.clipboard.writeText(message);
  };

  const copyAll = () => {
    if (!reminders) return;
    const text = reminders
      .map(r => `=== ${r.guestName} ===\n${r.message}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Reminder Texts</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {reminders
              ? `${reminders.length} messages ready`
              : 'Generate personalized reminders'}
          </p>
        </div>
        <div className="flex gap-2">
          {reminders && (
            <button
              onClick={copyAll}
              className="text-sm text-terracotta hover:text-terracotta-dark transition-colors"
            >
              {copiedAll ? 'Copied!' : 'Copy All'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={!hasAcceptedGuests || loading}
            className="px-4 py-1.5 text-sm font-medium text-white bg-terracotta rounded-lg
              hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Generating...'
              : reminders
              ? 'Regenerate'
              : 'Generate Reminders'}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="p-8 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-terracotta mb-3"></div>
          <p>Generating bios and composing reminder texts...</p>
        </div>
      )}

      {error && (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && !reminders && !hasAcceptedGuests && (
        <div className="p-4 text-center text-gray-500 text-sm">
          No accepted guests yet. Reminders can only be generated once guests have accepted.
        </div>
      )}

      {reminders && !loading && (
        <div className="divide-y divide-gray-100">
          {reminders.map(r => (
            <ReminderCard key={r.guestId} reminder={r} onCopy={copySingle} />
          ))}
        </div>
      )}
    </div>
  );
}

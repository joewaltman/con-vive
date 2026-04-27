'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import type { FeedbackToken } from '@/lib/types/admin';

interface FeedbackSectionProps {
  dinnerId: string;
  dinnerDate: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  // Format as (XXX) XXX-XXXX
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function buildSmsMessage(firstName: string, token: string): string {
  const url = `https://con-vive.com/feedback/${token}`;
  return `Hey ${firstName}! Thanks again for coming to dinner. Could you take 60 seconds to share some quick feedback? It really helps me put better tables together going forward. ${url}\n\n– Joe`;
}

export default function FeedbackSection({ dinnerId, dinnerDate }: FeedbackSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Check if dinner date is in the past
  const dinnerDateObj = new Date(dinnerDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastDinner = dinnerDateObj < today;

  // Fetch existing tokens
  const { data: tokensData } = useSWR<{ tokens: FeedbackToken[] }>(
    isPastDinner ? `/api/admin/dinners/${dinnerId}/feedback/generate` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const tokens = tokensData?.tokens || [];
  const hasTokens = tokens.length > 0;
  const completedCount = tokens.filter(t => t.completedAt).length;

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/admin/dinners/${dinnerId}/feedback/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate feedback links');
      }

      // Revalidate tokens
      mutate(`/api/admin/dinners/${dinnerId}/feedback/generate`);
    } catch (error) {
      console.error('Error generating feedback links:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate feedback links');
    } finally {
      setIsGenerating(false);
    }
  }, [dinnerId, isGenerating]);

  const handleCopy = useCallback(async (token: FeedbackToken) => {
    const message = buildSmsMessage(token.guest.firstName, token.token);
    try {
      await navigator.clipboard.writeText(message);
      setCopiedToken(token.token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedToken(token.token);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  }, []);

  // Don't show for future dinners
  if (!isPastDinner) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="font-medium text-gray-900">Post-Dinner Feedback</h2>
          {hasTokens && (
            <p className="text-xs text-gray-500 mt-0.5">
              {completedCount} of {tokens.length} completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasTokens && (
            <button
              onClick={() => setShowResults(!showResults)}
              className="px-3 py-1.5 text-xs font-medium text-terracotta border border-terracotta rounded-lg hover:bg-terracotta/5 transition-colors"
            >
              {showResults ? 'Hide Results' : 'View Results'}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 text-xs font-medium text-white bg-terracotta rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : hasTokens ? 'Refresh' : 'Generate Links'}
          </button>
        </div>
      </div>

      {showResults && hasTokens && (
        <FeedbackResultsView dinnerId={dinnerId} />
      )}

      {!showResults && hasTokens && (
        <div className="divide-y divide-gray-100">
          {tokens.map(token => (
            <div
              key={token.id}
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    token.completedAt ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {token.guest.firstName} {token.guest.lastName}
                  </p>
                  {token.guest.phone && (
                    <p className="text-xs text-gray-500">
                      {formatPhone(token.guest.phone)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleCopy(token)}
                disabled={!token.guest.phone}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  copiedToken === token.token
                    ? 'bg-green-100 text-green-700'
                    : token.guest.phone
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                {copiedToken === token.token ? 'Copied!' : 'Copy SMS'}
              </button>
            </div>
          ))}
        </div>
      )}

      {!hasTokens && (
        <p className="p-4 text-sm text-gray-500 text-center">
          Click &quot;Generate Links&quot; to create feedback links for all attendees.
        </p>
      )}
    </div>
  );
}

// Results view component
import type { FeedbackResults } from '@/lib/types/admin';

function FeedbackResultsView({ dinnerId }: { dinnerId: string }) {
  const { data: results, isLoading } = useSWR<FeedbackResults>(
    `/api/admin/dinners/${dinnerId}/feedback/results`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        Loading results...
      </div>
    );
  }

  if (!results) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        No results available.
      </div>
    );
  }

  const { totalTokens, completedCount, aggregates, comments } = results;

  return (
    <div className="border-t border-gray-200">
      {/* Summary */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{completedCount}</span> of{' '}
          <span className="font-medium">{totalTokens}</span> guests have submitted feedback
        </p>
      </div>

      {/* Aggregates */}
      {aggregates.length > 0 && (
        <div className="divide-y divide-gray-100">
          {aggregates.map(agg => (
            <div key={agg.guestId} className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {agg.firstName} {agg.lastInitial}
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-600">
                  {agg.yesCount} yes
                </span>
                <span className="text-gray-500">
                  {agg.notSureCount} not sure
                </span>
                <span className="text-red-600">
                  {agg.noCount} no
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {aggregates.length === 0 && completedCount === 0 && (
        <p className="p-4 text-sm text-gray-500 text-center">
          No ratings submitted yet.
        </p>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Comments
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {comments.map((comment, idx) => (
              <div key={idx} className="px-4 py-3">
                <p className="text-sm text-gray-700 italic">&ldquo;{comment}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

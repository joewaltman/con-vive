'use client';

import { useState } from 'react';

interface FollowUpQuestionsProps {
  guestId: string;
  hasEnoughData: boolean;
}

type State = 'idle' | 'loading' | 'results' | 'error';

export default function FollowUpQuestions({ guestId, hasEnoughData }: FollowUpQuestionsProps) {
  const [state, setState] = useState<State>('idle');
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setState('loading');
    setError(null);

    try {
      const response = await fetch(`/api/guests/${guestId}/follow-up-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setState('error');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Follow-Up Questions</h4>
        <button
          onClick={generate}
          disabled={!hasEnoughData || state === 'loading'}
          className="px-3 py-1.5 text-sm font-medium text-white bg-terracotta rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'loading' ? 'Generating...' : questions ? 'Regenerate' : 'Generate Questions'}
        </button>
      </div>

      {!hasEnoughData && state === 'idle' && (
        <p className="text-sm text-gray-500">
          Add more profile data to generate follow-up questions.
        </p>
      )}

      {state === 'error' && error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {questions && state === 'results' && (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <QuestionCard key={i} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question }: { question: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
      <p className="flex-1 text-sm text-gray-700">{question}</p>
      <button
        onClick={copyToClipboard}
        className="text-xs text-terracotta hover:text-terracotta-dark flex-shrink-0"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

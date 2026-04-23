'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div
        className={`
          px-4 py-3 rounded-lg shadow-lg text-sm font-medium
          ${type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <span>
            {type === 'success' ? '✓' : '✕'}
          </span>
          <span>{message}</span>
          <button
            onClick={onClose}
            className="ml-2 hover:opacity-70"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

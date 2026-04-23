'use client';

import { format } from 'date-fns';
import type { Dinner } from '@/lib/types';
import { INVITATION_RESPONSE_OPTIONS } from '@/lib/constants';

interface DinnerCardProps {
  dinner: Dinner;
  compact?: boolean;
  onClick?: () => void;
}

export default function DinnerCard({ dinner, compact = false, onClick }: DinnerCardProps) {
  const name = dinner.fields['Dinner Name'] || 'Unnamed Dinner';
  const date = dinner.fields['Dinner Date'];
  const startTime = dinner.fields['Start Time'] || '18:00';
  const menu = dinner.fields['Menu'] || '';
  const guestCount = dinner.fields['Guest Count'] || 7;
  const confirmedCount = dinner.confirmedCount || 0;

  const hostName = dinner.host
    ? `${dinner.host.fields['First Name'] || ''} ${dinner.host.fields['Last Name'] || ''}`.trim()
    : dinner.fields['Host'] || 'No Host';

  const formattedDate = date
    ? format(new Date(date + 'T00:00:00'), 'EEE, MMM d')
    : 'No Date';

  const formattedTime = startTime
    ? format(new Date(`2000-01-01T${startTime}`), 'h:mm a')
    : '';

  // Get invitation summary dots (for non-compact view)
  const invitations = dinner.invitations || [];
  const responseCounts = {
    Accepted: invitations.filter(i => i.response === 'Accepted').length,
    Declined: invitations.filter(i => i.response === 'Declined').length,
    Invited: invitations.filter(i => i.response === 'Invited').length,
    NoResponse: invitations.filter(i => !i.response).length,
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <span className="font-medium text-gray-700 truncate">{name}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-sm text-gray-500">
            <span>{formattedDate}</span>
            <span>{hostName}</span>
            <span>{confirmedCount} guests</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-terracotta/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <span>{formattedDate}</span>
            {formattedTime && (
              <>
                <span className="text-gray-400">at</span>
                <span>{formattedTime}</span>
              </>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Host: {hostName}
          </p>
          {menu && (
            <p className="text-sm text-gray-400 mt-1 truncate">{menu}</p>
          )}
        </div>

        <div className="text-right shrink-0 ml-4">
          <div className="text-lg font-semibold text-gray-900">
            {confirmedCount} <span className="text-gray-400 font-normal">/ {guestCount}</span>
          </div>
          <div className="text-xs text-gray-500">confirmed</div>

          {/* Response dots */}
          {invitations.length > 0 && (
            <div className="flex items-center justify-end gap-1 mt-2">
              {INVITATION_RESPONSE_OPTIONS.map(option => {
                const count = option.value === null
                  ? responseCounts.NoResponse
                  : responseCounts[option.value as keyof typeof responseCounts] || 0;

                if (count === 0) return null;

                return (
                  <div
                    key={option.label}
                    className="flex items-center gap-0.5"
                    title={`${count} ${option.label}`}
                  >
                    {[...Array(Math.min(count, 5))].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    ))}
                    {count > 5 && (
                      <span className="text-xs text-gray-400">+{count - 5}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

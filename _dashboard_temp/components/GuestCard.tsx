import { formatDistanceToNow } from 'date-fns';
import Badge from './Badge';
import type { Guest } from '@/lib/types';

interface GuestCardProps {
  guest: Guest;
  selected: boolean;
  onClick: () => void;
}

export default function GuestCard({ guest, selected, onClick }: GuestCardProps) {
  const { fields } = guest;
  const firstName = fields['First Name'] || '';
  const lastName = fields['Last Name'] || '';
  const funnelStage = fields['Funnel Stage'] || 'New';
  const ageRange = fields['Age Range'] || '';
  const createdTime = fields['Created Time'] || guest.createdTime;

  const fullName = `${firstName} ${lastName}`.trim() || 'Unnamed Guest';
  const relativeTime = createdTime
    ? formatDistanceToNow(new Date(createdTime), { addSuffix: true })
    : '';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 border-b border-gray-100 transition-colors
        ${selected
          ? 'bg-terracotta/10 border-l-2 border-l-terracotta'
          : 'hover:bg-gray-50 border-l-2 border-l-transparent'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900 truncate">{fullName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge stage={funnelStage} />
            {ageRange && (
              <span className="text-xs text-gray-500">{ageRange}</span>
            )}
          </div>
        </div>
      </div>
      {relativeTime && (
        <p className="text-xs text-gray-400 mt-1.5">{relativeTime}</p>
      )}
    </button>
  );
}

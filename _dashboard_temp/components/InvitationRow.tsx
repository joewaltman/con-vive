'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Invitation, InvitationResponse } from '@/lib/types';
import { INVITATION_RESPONSE_OPTIONS, getInvitationStatusColor } from '@/lib/constants';

interface InvitationRowProps {
  invitation: Invitation;
  onResponseChange: (id: number, response: InvitationResponse) => Promise<void>;
  onResend?: (id: number) => Promise<void>;
  onMarkDeclined?: (id: number) => Promise<void>;
}

export default function InvitationRow({
  invitation,
  onResponseChange,
  onResend,
  onMarkDeclined,
}: InvitationRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResponseChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const response: InvitationResponse = value === '' ? null : value as InvitationResponse;

    setIsUpdating(true);
    try {
      await onResponseChange(invitation.id, response);
    } finally {
      setIsUpdating(false);
    }
  }, [invitation.id, onResponseChange]);

  const handleResend = useCallback(async () => {
    if (!onResend) return;
    setShowMenu(false);
    setIsUpdating(true);
    try {
      await onResend(invitation.id);
    } finally {
      setIsUpdating(false);
    }
  }, [invitation.id, onResend]);

  const handleMarkDeclined = useCallback(async () => {
    if (!onMarkDeclined) return;
    setShowMenu(false);
    setIsUpdating(true);
    try {
      await onMarkDeclined(invitation.id);
    } finally {
      setIsUpdating(false);
    }
  }, [invitation.id, onMarkDeclined]);

  const currentOption = INVITATION_RESPONSE_OPTIONS.find(
    opt => opt.value === invitation.response
  ) || INVITATION_RESPONSE_OPTIONS[3]; // Default to "No Response"

  // Display status (prefer new status field, fall back to response)
  const displayStatus = invitation.status || (invitation.response === 'Accepted' ? 'confirmed' : invitation.response === 'Declined' ? 'declined' : invitation.response === 'Invited' ? 'invited' : null);
  const statusColor = getInvitationStatusColor(displayStatus);

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-gray-100 last:border-b-0">
      {/* Guest Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={`/?guest=${invitation.guestId}`}
            className="font-medium text-gray-900 hover:text-terracotta hover:underline"
          >
            {invitation.guestName}
          </a>
          {displayStatus && (
            <span
              className="px-1.5 py-0.5 text-xs font-medium rounded text-white"
              style={{ backgroundColor: statusColor }}
            >
              {displayStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {invitation.phone && (
            <span className="text-xs text-gray-500">{invitation.phone}</span>
          )}
          {invitation.gender && (
            <span className="text-xs text-gray-400">
              ({invitation.gender === 'Male' ? 'M' : invitation.gender === 'Female' ? 'F' : '--'})
            </span>
          )}
          {invitation.bringCategory && (
            <span className="text-xs text-amber-600">
              Bringing: {invitation.bringCategory}
            </span>
          )}
        </div>
      </div>

      {/* Response Dropdown */}
      <div className="shrink-0 w-36">
        <select
          value={invitation.response || ''}
          onChange={handleResponseChange}
          disabled={isUpdating}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta disabled:opacity-50"
          style={{
            backgroundColor: `${currentOption.color}15`,
            borderColor: currentOption.color,
          }}
        >
          {INVITATION_RESPONSE_OPTIONS.map(option => (
            <option key={option.label} value={option.value || ''}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Invite Sent Date */}
      <div className="shrink-0 w-24 text-right">
        {invitation.inviteSentDate || invitation.inviteEmailSentAt ? (
          <span className="text-xs text-gray-500">
            Sent {invitation.inviteSentDate || new Date(invitation.inviteEmailSentAt!).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Not sent</span>
        )}
      </div>

      {/* Notes indicator */}
      {invitation.notes && (
        <div className="shrink-0" title={invitation.notes}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
      )}

      {/* Actions Menu */}
      {(onResend || onMarkDeclined) && (
        <div className="shrink-0 relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={isUpdating}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {onResend && (invitation.token || invitation.magicToken) && (
                <button
                  onClick={handleResend}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                >
                  Resend Invite
                </button>
              )}
              {onMarkDeclined && invitation.status !== 'declined' && invitation.response !== 'Declined' && (
                <button
                  onClick={handleMarkDeclined}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                >
                  Mark Declined
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

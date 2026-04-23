'use client';

import { useMemo } from 'react';
import { formatDistanceToNow, isPast } from 'date-fns';
import type { Dinner, BringSlots } from '@/lib/types';
import { getDinnerStatusColor, DEFAULT_BRING_SLOTS } from '@/lib/constants';

interface DinnerStatusHeaderProps {
  dinner: Dinner;
}

export default function DinnerStatusHeader({ dinner }: DinnerStatusHeaderProps) {
  const status = dinner.fields['Status'] || 'draft';
  const statusColor = getDinnerStatusColor(status);
  const totalSeats = dinner.fields['Total Seats'] || 8;
  const bringSlots = (dinner.fields['Bring Slots'] as BringSlots) || DEFAULT_BRING_SLOTS;
  const bookingCutoff = dinner.fields['Booking Cutoff At'];

  // Calculate invitation stats
  const stats = useMemo(() => {
    const invitations = dinner.invitations || [];

    // Count by status
    const confirmed = invitations.filter(i => i.status === 'confirmed' || i.response === 'Accepted');
    const pending = invitations.filter(i =>
      i.status === 'invited' ||
      i.status === 'checkout_pending' ||
      (!i.status && i.response === 'Invited')
    );

    // Gender breakdown
    const confirmedMale = confirmed.filter(i => i.gender === 'Male').length;
    const confirmedFemale = confirmed.filter(i => i.gender === 'Female').length;
    const pendingMale = pending.filter(i => i.gender === 'Male').length;
    const pendingFemale = pending.filter(i => i.gender === 'Female').length;

    // Bring items claimed
    const bringClaims = {
      wine: invitations.filter(i => i.bringCategory === 'wine' && (i.status === 'confirmed' || i.response === 'Accepted')).length,
      appetizer: invitations.filter(i => i.bringCategory === 'appetizer' && (i.status === 'confirmed' || i.response === 'Accepted')).length,
      dessert: invitations.filter(i => i.bringCategory === 'dessert' && (i.status === 'confirmed' || i.response === 'Accepted')).length,
    };

    return {
      confirmed: confirmed.length,
      pending: pending.length,
      confirmedMale,
      confirmedFemale,
      pendingMale,
      pendingFemale,
      bringClaims,
    };
  }, [dinner.invitations]);

  // Cutoff countdown
  const cutoffInfo = useMemo(() => {
    if (!bookingCutoff) return null;

    const cutoffDate = new Date(bookingCutoff);
    if (isPast(cutoffDate)) {
      return { text: 'Booking closed', isPast: true };
    }

    return {
      text: `Closes ${formatDistanceToNow(cutoffDate, { addSuffix: true })}`,
      isPast: false,
    };
  }, [bookingCutoff]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-1 text-sm font-medium rounded-full text-white"
            style={{ backgroundColor: statusColor }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {cutoffInfo && (
            <span className={`text-sm ${cutoffInfo.isPast ? 'text-gray-500' : 'text-amber-600'}`}>
              {cutoffInfo.text}
            </span>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* Seats */}
        <div className="text-sm">
          <span className="text-gray-500">Seats:</span>{' '}
          <span className="font-medium text-gray-900">
            {stats.confirmed}/{totalSeats} confirmed
          </span>
          {stats.pending > 0 && (
            <span className="text-gray-500"> | {stats.pending} pending</span>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* Gender */}
        <div className="text-sm">
          <span className="text-gray-500">Gender:</span>{' '}
          <span className="font-medium text-gray-900">
            {stats.confirmedFemale}W {stats.confirmedMale}M
          </span>
          {(stats.pendingMale > 0 || stats.pendingFemale > 0) && (
            <span className="text-gray-500">
              {' '}| Pending: {stats.pendingFemale}W {stats.pendingMale}M
            </span>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 hidden lg:block" />

        {/* Bring Items */}
        <div className="text-sm hidden lg:block">
          <span className="text-gray-500">Bring:</span>{' '}
          <span className="text-gray-600">
            Wine {stats.bringClaims.wine}/{bringSlots.wine}
            {' | '}
            App {stats.bringClaims.appetizer}/{bringSlots.appetizer}
            {' | '}
            Dessert {stats.bringClaims.dessert}/{bringSlots.dessert}
          </span>
        </div>
      </div>
    </div>
  );
}

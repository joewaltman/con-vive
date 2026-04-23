'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import useSWR, { mutate } from 'swr';
import InvitationRow from './InvitationRow';
import BringItemSection from './BringItemSection';
import ReminderSection from './ReminderSection';
import DinnerStatusHeader from './DinnerStatusHeader';
import CancelDinnerModal from './CancelDinnerModal';
import type { Dinner, DinnerFields, Host, InvitationResponse } from '@/lib/types';

interface DinnerDetailProps {
  dinnerId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DinnerDetail({ dinnerId }: DinnerDetailProps) {
  const router = useRouter();
  const [editedFields, setEditedFields] = useState<Partial<DinnerFields>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch dinner details
  const { data: dinner, error, isLoading } = useSWR<Dinner>(
    `/api/dinners/${dinnerId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch hosts for dropdown
  const { data: hosts } = useSWR<Host[]>('/api/hosts', fetcher, {
    revalidateOnFocus: false,
  });

  // Initialize selected host when dinner loads
  useEffect(() => {
    if (dinner?.fields['Host ID']) {
      setSelectedHostId(String(dinner.fields['Host ID']));
    }
  }, [dinner?.fields['Host ID']]);

  // Reset edited fields when dinner changes
  useEffect(() => {
    setEditedFields({});
  }, [dinnerId]);

  const getValue = useCallback((field: keyof DinnerFields) => {
    if (field in editedFields) {
      return editedFields[field];
    }
    return dinner?.fields[field];
  }, [editedFields, dinner?.fields]);

  const handleChange = useCallback((field: keyof DinnerFields, value: unknown) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleHostChange = useCallback((hostId: string) => {
    setSelectedHostId(hostId);
    if (hostId) {
      setEditedFields(prev => ({
        ...prev,
        'Host ID': parseInt(hostId),
      }));
    } else {
      setEditedFields(prev => {
        const { 'Host ID': _unused, ...rest } = prev;
        void _unused;
        return rest;
      });
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (Object.keys(editedFields).length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/dinners/${dinnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: editedFields }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      mutate(`/api/dinners/${dinnerId}`);
      mutate('/api/dinners?filter=upcoming');
      mutate('/api/dinners?filter=past');
      setEditedFields({});
    } finally {
      setIsSaving(false);
    }
  }, [dinnerId, editedFields]);

  const handleInvitationResponseChange = useCallback(async (
    invitationId: number,
    response: InvitationResponse
  ) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/response`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update response');
      }

      mutate(`/api/dinners/${dinnerId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update response');
      throw err;
    }
  }, [dinnerId]);

  const handleResendInvite = useCallback(async (invitationId: number) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resend invite');
      }

      mutate(`/api/dinners/${dinnerId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resend invite');
      throw err;
    }
  }, [dinnerId]);

  const handleMarkDeclined = useCallback(async (invitationId: number) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/mark-declined`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark as declined');
      }

      mutate(`/api/dinners/${dinnerId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark as declined');
      throw err;
    }
  }, [dinnerId]);

  const handleAddBringItem = useCallback(async (
    category: string,
    description: string | null,
    slots: number
  ) => {
    const response = await fetch(`/api/dinners/${dinnerId}/bring-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, description, slots }),
    });

    if (!response.ok) {
      throw new Error('Failed to add item');
    }

    mutate(`/api/dinners/${dinnerId}`);
  }, [dinnerId]);

  const handleDeleteBringItem = useCallback(async (itemId: number) => {
    const response = await fetch(`/api/bring-items/${itemId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete item');
    }

    mutate(`/api/dinners/${dinnerId}`);
  }, [dinnerId]);

  const handleDeleteDinner = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/dinners/${dinnerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete dinner');
      }

      // Revalidate dinner lists
      mutate('/api/dinners?filter=upcoming');
      mutate('/api/dinners?filter=past');

      // Navigate back to dinners list
      router.push('/dinners');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [dinnerId, router]);

  const hasChanges = Object.keys(editedFields).length > 0;

  const inputClass = (field: keyof DinnerFields) => `
    w-full px-3 py-2 text-sm border rounded-lg transition-colors
    ${field in editedFields
      ? 'border-amber-400 bg-amber-50'
      : 'border-gray-300 bg-white'
    }
    focus:ring-1 focus:ring-terracotta focus:border-terracotta
  `;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !dinner) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading dinner</p>
          <p className="text-sm mt-1">{error?.message || 'Dinner not found'}</p>
          <button
            onClick={() => router.push('/dinners')}
            className="mt-4 text-terracotta hover:underline"
          >
            Back to dinners
          </button>
        </div>
      </div>
    );
  }

  const hostName = dinner.host
    ? `${dinner.host.fields['First Name'] || ''} ${dinner.host.fields['Last Name'] || ''}`.trim()
    : dinner.fields['Host'] || '';

  const formattedDate = dinner.fields['Dinner Date']
    ? format(new Date(dinner.fields['Dinner Date'] + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
    : '';

  const activeHosts = (hosts || []).filter(h => h.fields['Active'] !== false);

  const hasAcceptedGuests = (dinner?.invitations || [])
    .some(inv => inv.response === 'Accepted');

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Error Banner */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-red-600">{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push('/dinners')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dinners
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            {dinner.fields['Dinner Name'] || 'Unnamed Dinner'}
          </h1>
          <p className="text-gray-600 mt-1">{formattedDate}</p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-terracotta text-white text-sm font-medium rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Status Header */}
      <DinnerStatusHeader dinner={dinner} />

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/dinners/${dinnerId}/shortlist`)}
          className="px-4 py-2 text-sm font-medium text-white bg-terracotta rounded-lg hover:bg-terracotta-dark transition-colors"
        >
          Add Invitees
        </button>
        {dinner.fields['Status'] !== 'cancelled' && dinner.fields['Status'] !== 'completed' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            Cancel Dinner
          </button>
        )}
      </div>

      {/* Dinner Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-medium text-gray-900 mb-4">Dinner Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={String(getValue('Dinner Date') || '')}
              onChange={(e) => handleChange('Dinner Date', e.target.value)}
              className={inputClass('Dinner Date')}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Time</label>
            <input
              type="time"
              value={String(getValue('Start Time') || '')}
              onChange={(e) => handleChange('Start Time', e.target.value)}
              className={inputClass('Start Time')}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Host</label>
            <select
              value={selectedHostId}
              onChange={(e) => handleHostChange(e.target.value)}
              className={inputClass('Host ID')}
            >
              <option value="">Select a host...</option>
              {activeHosts.map(host => (
                <option key={host.id} value={host.id}>
                  {host.fields['First Name']} {host.fields['Last Name']}
                </option>
              ))}
            </select>
            {!selectedHostId && hostName && (
              <p className="text-xs text-gray-400 mt-1">Legacy: {hostName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Target Guest Count</label>
            <input
              type="number"
              min="1"
              max="20"
              value={Number(getValue('Guest Count')) || 7}
              onChange={(e) => handleChange('Guest Count', parseInt(e.target.value) || 7)}
              className={inputClass('Guest Count')}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Location</label>
            <input
              type="text"
              value={String(getValue('Location') || '')}
              onChange={(e) => handleChange('Location', e.target.value)}
              className={inputClass('Location')}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Menu</label>
            <input
              type="text"
              value={String(getValue('Menu') || '')}
              onChange={(e) => handleChange('Menu', e.target.value)}
              className={inputClass('Menu')}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              value={String(getValue('Notes') || '')}
              onChange={(e) => handleChange('Notes', e.target.value)}
              rows={3}
              className={inputClass('Notes')}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Stripe Payment Link</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://buy.stripe.com/..."
                value={String(getValue('Payment Link') || '')}
                onChange={(e) => handleChange('Payment Link', e.target.value)}
                className={inputClass('Payment Link')}
              />
              {getValue('Payment Link') && (
                <a
                  href={String(getValue('Payment Link'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-3 py-2 text-sm text-terracotta border border-terracotta rounded-lg hover:bg-terracotta hover:text-white transition-colors"
                >
                  Open
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invited Guests */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-medium text-gray-900">Invited Guests</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {dinner.confirmedCount || 0} confirmed of {dinner.invitations?.length || 0} invited
          </p>
        </div>
        <div>
          {!dinner.invitations || dinner.invitations.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">
              No guests invited yet.
            </p>
          ) : (
            dinner.invitations.map(invitation => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                onResponseChange={handleInvitationResponseChange}
                onResend={handleResendInvite}
                onMarkDeclined={handleMarkDeclined}
              />
            ))
          )}
        </div>
      </div>

      {/* What to Bring */}
      <BringItemSection
        items={dinner.bringItems || []}
        onAdd={handleAddBringItem}
        onDelete={handleDeleteBringItem}
      />

      {/* Reminder Texts */}
      <ReminderSection
        dinnerId={dinnerId}
        hasAcceptedGuests={hasAcceptedGuests}
      />

      {/* Delete Dinner */}
      <div className="border-t border-gray-200 pt-6 mt-8">
        {showDeleteConfirm ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 mb-3">
              Are you sure you want to delete this dinner? This will also remove all invitations and bring items. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteDinner}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Dinner'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Delete this dinner
          </button>
        )}
      </div>

      {/* Cancel Dinner Modal */}
      <CancelDinnerModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        dinner={dinner}
        onCancelled={() => {
          mutate(`/api/dinners/${dinnerId}`);
          setShowCancelModal(false);
        }}
      />
    </div>
  );
}

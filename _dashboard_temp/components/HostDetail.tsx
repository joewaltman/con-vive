'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import GuestSearchInput from './GuestSearchInput';
import type { Host, HostFields, Guest } from '@/lib/types';

interface HostDetailProps {
  host: Host;
  onSave: (id: string, fields: Partial<HostFields>) => Promise<void>;
  onBack?: () => void;
  showBackButton?: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HostDetail({ host, onSave, onBack, showBackButton }: HostDetailProps) {
  const [editedFields, setEditedFields] = useState<Partial<HostFields>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [linkedGuest, setLinkedGuest] = useState<Guest | null>(host.linkedGuest || null);

  // Fetch host dinners
  const { data: hostData } = useSWR<Host>(`/api/hosts/${host.id}`, fetcher, {
    revalidateOnFocus: false,
  });

  // Reset edited fields when host changes
  useEffect(() => {
    setEditedFields({});
    setLinkedGuest(host.linkedGuest || null);
  }, [host.id, host.linkedGuest]);

  const getValue = useCallback((field: keyof HostFields) => {
    if (field in editedFields) {
      return editedFields[field];
    }
    return host.fields[field];
  }, [editedFields, host.fields]);

  const handleChange = useCallback((field: keyof HostFields, value: unknown) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleGuestLinkChange = useCallback((guest: Guest | null) => {
    setLinkedGuest(guest);
    setEditedFields(prev => ({
      ...prev,
      'Guest ID': guest ? Number(guest.id) : null,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (Object.keys(editedFields).length === 0) return;

    setIsSaving(true);
    try {
      await onSave(host.id, editedFields);
      setEditedFields({});
    } finally {
      setIsSaving(false);
    }
  }, [host.id, editedFields, onSave]);

  const hasChanges = Object.keys(editedFields).length > 0;

  const inputClass = (field: keyof HostFields) => `
    w-full px-3 py-2 text-sm border rounded-lg transition-colors
    ${field in editedFields
      ? 'border-amber-400 bg-amber-50'
      : 'border-gray-300 bg-white'
    }
    focus:ring-1 focus:ring-terracotta focus:border-terracotta
  `;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {host.fields['First Name']} {host.fields['Last Name']}
              </h2>
              <p className="text-sm text-gray-500">
                {host.dinnerCount || 0} dinner{(host.dinnerCount || 0) !== 1 ? 's' : ''} hosted
              </p>
            </div>
          </div>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">First Name</label>
                <input
                  type="text"
                  value={String(getValue('First Name') || '')}
                  onChange={(e) => handleChange('First Name', e.target.value)}
                  className={inputClass('First Name')}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                <input
                  type="text"
                  value={String(getValue('Last Name') || '')}
                  onChange={(e) => handleChange('Last Name', e.target.value)}
                  className={inputClass('Last Name')}
                />
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={String(getValue('Phone') || '')}
                  onChange={(e) => handleChange('Phone', e.target.value)}
                  className={inputClass('Phone')}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={String(getValue('Email') || '')}
                  onChange={(e) => handleChange('Email', e.target.value)}
                  className={inputClass('Email')}
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Location</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <input
                  type="text"
                  value={String(getValue('Address') || '')}
                  onChange={(e) => handleChange('Address', e.target.value)}
                  className={inputClass('Address')}
                />
              </div>
              <div className="w-1/2">
                <label className="block text-xs text-gray-500 mb-1">City</label>
                <input
                  type="text"
                  value={String(getValue('City') || '')}
                  onChange={(e) => handleChange('City', e.target.value)}
                  className={inputClass('City')}
                />
              </div>
            </div>
          </section>

          {/* Hosting */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Hosting</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Guests</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={Number(getValue('Max Guests')) || 8}
                  onChange={(e) => handleChange('Max Guests', parseInt(e.target.value) || 8)}
                  className={inputClass('Max Guests')}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={getValue('Active') !== false ? 'active' : 'inactive'}
                  onChange={(e) => handleChange('Active', e.target.value === 'active')}
                  className={inputClass('Active')}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </section>

          {/* Guest Link */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Linked Guest Profile</h3>
            <GuestSearchInput
              value={linkedGuest}
              onChange={handleGuestLinkChange}
              placeholder="Search to link a guest profile..."
            />
            {linkedGuest && (
              <p className="mt-2 text-xs text-gray-500">
                <a
                  href={`/?guest=${linkedGuest.id}`}
                  className="text-terracotta hover:underline"
                >
                  View guest profile
                </a>
              </p>
            )}
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Notes</h3>
            <textarea
              value={String(getValue('Notes') || '')}
              onChange={(e) => handleChange('Notes', e.target.value)}
              rows={4}
              className={inputClass('Notes')}
            />
          </section>

          {/* Dinner History */}
          {hostData && (
            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Dinner History</h3>
              {host.dinnerCount === 0 ? (
                <p className="text-sm text-gray-500">No dinners hosted yet</p>
              ) : (
                <p className="text-sm text-gray-500">
                  {host.dinnerCount} dinner{host.dinnerCount !== 1 ? 's' : ''} hosted.{' '}
                  <a href="/dinners" className="text-terracotta hover:underline">
                    View all dinners
                  </a>
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

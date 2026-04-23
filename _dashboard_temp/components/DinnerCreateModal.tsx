'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import useSWR from 'swr';
import type { DinnerFields, DinnerStatus, DinnerType, BringSlots } from '@/lib/types';
import {
  DEFAULT_START_TIME,
  DEFAULT_TOTAL_SEATS,
  DEFAULT_MIN_PER_GENDER,
  DEFAULT_PRICE_CENTS,
  DEFAULT_BRING_SLOTS,
  DINNER_TYPE_OPTIONS,
} from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Generate dinner name in format {mon}{dd}_{firstname}
function generateDinnerName(date: string, hostFirstName: string): string {
  const [, month, day] = date.split('-').map(Number);
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthStr = months[month - 1];
  const dayStr = String(day).padStart(2, '0');
  const name = hostFirstName.toLowerCase();
  return `${monthStr}${dayStr}_${name}`;
}

// Default booking cutoff is 6 hours before dinner start time
function getDefaultCutoff(dinnerDate: string, startTime: string = '18:00'): string {
  const date = new Date(`${dinnerDate}T${startTime}:00`);
  const cutoff = new Date(date.getTime() - 6 * 60 * 60 * 1000); // 6 hours before
  return cutoff.toISOString().slice(0, 16); // datetime-local format
}

interface HostCandidate {
  id: number;
  firstName: string;
  lastName: string;
  address: string | null;
  city: string | null;
  dinnerCount: number;
}

interface DinnerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (fields: Partial<DinnerFields>) => Promise<void>;
}

export default function DinnerCreateModal({ isOpen, onClose, onCreate }: DinnerCreateModalProps) {
  const [fields, setFields] = useState<Partial<DinnerFields>>({
    'Dinner Date': format(new Date(), 'yyyy-MM-dd'),
    'Start Time': DEFAULT_START_TIME,
    'Total Seats': DEFAULT_TOTAL_SEATS,
    'Min Per Gender': DEFAULT_MIN_PER_GENDER,
    'Price Cents': DEFAULT_PRICE_CENTS,
    'Dinner Type': 'couples_allowed',
    'Bring Slots': DEFAULT_BRING_SLOTS,
    'Status': 'draft',
  });
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [useAutoName, setUseAutoName] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    booking: false,
    location: false,
    menu: false,
  });

  // Fetch host candidates (guests who can host)
  const { data: hostCandidates } = useSWR<HostCandidate[]>(
    isOpen ? '/api/dinners/host-candidates' : null,
    fetcher
  );

  // Get selected host
  const selectedHost = useMemo(() => {
    return hostCandidates?.find(h => String(h.id) === selectedHostId) || null;
  }, [hostCandidates, selectedHostId]);

  // Auto-generate dinner name
  const autoName = useMemo(() => {
    if (!fields['Dinner Date'] || !selectedHost) return '';
    return generateDinnerName(fields['Dinner Date'], selectedHost.firstName);
  }, [fields['Dinner Date'], selectedHost]);

  // Auto-fill address from host
  useEffect(() => {
    if (selectedHost?.address) {
      setFields(prev => ({
        ...prev,
        'Address': selectedHost.address || undefined,
        'Location': selectedHost.address || undefined, // Also set legacy Location field
      }));
    }
  }, [selectedHost]);

  // Update booking cutoff when date or time changes
  useEffect(() => {
    if (fields['Dinner Date']) {
      const startTime = (fields['Start Time'] as string) || '18:00';
      setFields(prev => ({
        ...prev,
        'Booking Cutoff At': getDefaultCutoff(fields['Dinner Date']!, startTime),
      }));
    }
  }, [fields['Dinner Date'], fields['Start Time']]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleChange = useCallback((field: keyof DinnerFields, value: unknown) => {
    setFields(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleBringSlotChange = useCallback((key: keyof BringSlots, value: number) => {
    setFields(prev => ({
      ...prev,
      'Bring Slots': {
        ...((prev['Bring Slots'] as BringSlots) || DEFAULT_BRING_SLOTS),
        [key]: value,
      },
    }));
  }, []);

  const handleHostChange = useCallback((hostId: string) => {
    setSelectedHostId(hostId);
    if (hostId) {
      setFields(prev => ({
        ...prev,
        'Host ID': parseInt(hostId),
      }));
    } else {
      setFields(prev => {
        const { 'Host ID': _unused, ...rest } = prev;
        void _unused;
        return rest;
      });
    }
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (status: DinnerStatus) => {
    if (!fields['Dinner Date']) {
      setError('Dinner date is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    const finalName = useAutoName ? autoName : customName;

    try {
      await onCreate({
        ...fields,
        'Dinner Name': finalName || `Dinner on ${fields['Dinner Date']}`,
        'Status': status,
        'Guest Count': fields['Total Seats'], // Keep legacy field in sync
      });

      // Reset form
      setFields({
        'Dinner Date': format(new Date(), 'yyyy-MM-dd'),
        'Start Time': DEFAULT_START_TIME,
        'Total Seats': DEFAULT_TOTAL_SEATS,
        'Min Per Gender': DEFAULT_MIN_PER_GENDER,
        'Price Cents': DEFAULT_PRICE_CENTS,
        'Dinner Type': 'couples_allowed',
        'Bring Slots': DEFAULT_BRING_SLOTS,
        'Status': 'draft',
      });
      setSelectedHostId('');
      setCustomName('');
      setUseAutoName(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dinner');
    } finally {
      setIsCreating(false);
    }
  }, [fields, useAutoName, autoName, customName, onCreate, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFields({
        'Dinner Date': format(new Date(), 'yyyy-MM-dd'),
        'Start Time': DEFAULT_START_TIME,
        'Total Seats': DEFAULT_TOTAL_SEATS,
        'Min Per Gender': DEFAULT_MIN_PER_GENDER,
        'Price Cents': DEFAULT_PRICE_CENTS,
        'Dinner Type': 'couples_allowed',
        'Bring Slots': DEFAULT_BRING_SLOTS,
        'Status': 'draft',
      });
      setSelectedHostId('');
      setCustomName('');
      setUseAutoName(true);
      setError(null);
      setExpandedSections({ basic: true, booking: false, location: false, menu: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const bringSlots = (fields['Bring Slots'] as BringSlots) || DEFAULT_BRING_SLOTS;
  const priceDollars = ((fields['Price Cents'] as number) || DEFAULT_PRICE_CENTS) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Schedule New Dinner</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Basic Info Section */}
          <CollapsibleSection
            title="Basic Info"
            expanded={expandedSections.basic}
            onToggle={() => toggleSection('basic')}
          >
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={String(fields['Dinner Date'] || '')}
                  onChange={(e) => handleChange('Dinner Date', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={String(fields['Start Time'] || DEFAULT_START_TIME)}
                  onChange={(e) => handleChange('Start Time', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
            </div>

            {/* Host */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <select
                value={selectedHostId}
                onChange={(e) => handleHostChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              >
                <option value="">Select a host...</option>
                {hostCandidates?.map(host => (
                  <option key={host.id} value={host.id}>
                    {host.firstName} {host.lastName}
                    {host.city ? ` (${host.city})` : ''}
                    {host.dinnerCount > 0 ? ` - ${host.dinnerCount} dinners` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dinner Name */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dinner Name
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="radio"
                    checked={useAutoName}
                    onChange={() => setUseAutoName(true)}
                    className="text-terracotta focus:ring-terracotta"
                  />
                  Auto-generate: {autoName || '(select date and host)'}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="radio"
                    checked={!useAutoName}
                    onChange={() => setUseAutoName(false)}
                    className="text-terracotta focus:ring-terracotta"
                  />
                  Custom name
                </label>
                {!useAutoName && (
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter dinner name..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  />
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* Booking Settings Section */}
          <CollapsibleSection
            title="Booking Settings"
            expanded={expandedSections.booking}
            onToggle={() => toggleSection('booking')}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Seats
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={Number(fields['Total Seats']) || DEFAULT_TOTAL_SEATS}
                  onChange={(e) => handleChange('Total Seats', parseInt(e.target.value) || DEFAULT_TOTAL_SEATS)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Per Gender
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={Number(fields['Min Per Gender']) || DEFAULT_MIN_PER_GENDER}
                  onChange={(e) => handleChange('Min Per Gender', parseInt(e.target.value) || DEFAULT_MIN_PER_GENDER)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={priceDollars}
                  onChange={(e) => handleChange('Price Cents', Math.round(parseFloat(e.target.value) * 100) || DEFAULT_PRICE_CENTS)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dinner Type
                </label>
                <select
                  value={fields['Dinner Type'] || 'couples_allowed'}
                  onChange={(e) => handleChange('Dinner Type', e.target.value as DinnerType)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                >
                  {DINNER_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking Cutoff
              </label>
              <input
                type="datetime-local"
                value={fields['Booking Cutoff At']?.slice(0, 16) || ''}
                onChange={(e) => handleChange('Booking Cutoff At', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default is 2 days before the dinner
              </p>
            </div>
          </CollapsibleSection>

          {/* Location Section */}
          <CollapsibleSection
            title="Location"
            expanded={expandedSections.location}
            onToggle={() => toggleSection('location')}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={String(fields['Address'] || '')}
                onChange={(e) => handleChange('Address', e.target.value)}
                placeholder="Enter address..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              />
              {selectedHost && !fields['Address'] && (
                <button
                  type="button"
                  onClick={() => handleChange('Address', '412 Hillcrest Drive, Encinitas CA 92024')}
                  className="text-xs text-terracotta hover:underline mt-1"
                >
                  Use Joe&apos;s address
                </button>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Parking Note</label>
              <input
                type="text"
                value={String(fields['Parking Note'] || '')}
                onChange={(e) => handleChange('Parking Note', e.target.value)}
                placeholder="e.g., Street parking available"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              />
            </div>
          </CollapsibleSection>

          {/* Menu & Vibe Section */}
          <CollapsibleSection
            title="Menu & Vibe"
            expanded={expandedSections.menu}
            onToggle={() => toggleSection('menu')}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Menu</label>
              <textarea
                value={String(fields['Menu'] || '')}
                onChange={(e) => handleChange('Menu', e.target.value)}
                rows={3}
                placeholder="Describe the menu..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Vibe Descriptor</label>
              <input
                type="text"
                value={String(fields['Vibe Descriptor'] || '')}
                onChange={(e) => handleChange('Vibe Descriptor', e.target.value)}
                placeholder="e.g., Cozy evening with great conversation"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bring Slots</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Wine</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={bringSlots.wine}
                    onChange={(e) => handleBringSlotChange('wine', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Appetizer</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={bringSlots.appetizer}
                    onChange={(e) => handleBringSlotChange('appetizer', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dessert</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={bringSlots.dessert}
                    onChange={(e) => handleBringSlotChange('dessert', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('open')}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-white bg-terracotta rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Saving...' : 'Save & Open Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <span className="font-medium text-gray-900">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

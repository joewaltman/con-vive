'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import type { HostFields } from '@/lib/types/admin';
import { DEFAULT_MAX_GUESTS } from '@/lib/admin/constants';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface GuestCandidate {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  zipCode: string | null;
  priority: string | null;
  hostingInterest: string | null;
  attendanceCount: number;
}

interface HostCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (fields: Partial<HostFields>) => Promise<void>;
}

export default function HostCreateModal({ isOpen, onClose, onCreate }: HostCreateModalProps) {
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Encinitas');
  const [maxGuests, setMaxGuests] = useState(DEFAULT_MAX_GUESTS);
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch guest candidates
  const { data: guestCandidates, isLoading } = useSWR<GuestCandidate[]>(
    isOpen ? '/api/admin/hosts/candidates' : null,
    fetcher
  );

  // Filter candidates based on search
  const filteredCandidates = useMemo(() => {
    if (!guestCandidates) return [];
    if (!searchQuery.trim()) return guestCandidates;

    const query = searchQuery.toLowerCase();
    return guestCandidates.filter(g =>
      g.firstName.toLowerCase().includes(query) ||
      g.lastName.toLowerCase().includes(query) ||
      (g.email && g.email.toLowerCase().includes(query))
    );
  }, [guestCandidates, searchQuery]);

  // Get selected guest
  const selectedGuest = useMemo(() => {
    return guestCandidates?.find(g => String(g.id) === selectedGuestId) || null;
  }, [guestCandidates, selectedGuestId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGuestId) {
      setError('Please select a guest to make a host');
      return;
    }

    if (!address.trim()) {
      setError('Address is required');
      return;
    }

    if (!city.trim()) {
      setError('City is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    const fields: Partial<HostFields> = {
      'Guest ID': parseInt(selectedGuestId),
      'First Name': selectedGuest?.firstName || '',
      'Last Name': selectedGuest?.lastName || '',
      'Phone': selectedGuest?.phone || '',
      'Email': selectedGuest?.email || '',
      'Address': address,
      'City': city,
      'Max Guests': maxGuests,
      'Notes': notes || undefined,
      'Active': active,
    };

    try {
      await onCreate(fields);
      // Reset form
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create host');
    } finally {
      setIsCreating(false);
    }
  }, [selectedGuestId, selectedGuest, address, city, maxGuests, notes, active, onCreate, onClose]);

  const resetForm = useCallback(() => {
    setSelectedGuestId('');
    setSearchQuery('');
    setAddress('');
    setCity('Encinitas');
    setMaxGuests(DEFAULT_MAX_GUESTS);
    setNotes('');
    setActive(true);
    setError(null);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Add New Host</h2>
            <p className="text-sm text-gray-500 mt-1">Select a vetted guest to become a host</p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Guest Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Guest <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta mb-2"
              />

              {isLoading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading guests...</div>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {filteredCandidates.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {searchQuery ? 'No matching guests found' : 'No eligible guests available'}
                    </div>
                  ) : (
                    filteredCandidates.map(guest => (
                      <label
                        key={guest.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${
                          selectedGuestId === String(guest.id) ? 'bg-terracotta/5' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="guest"
                          value={guest.id}
                          checked={selectedGuestId === String(guest.id)}
                          onChange={(e) => {
                            setSelectedGuestId(e.target.value);
                            setError(null);
                          }}
                          className="text-terracotta focus:ring-terracotta"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {guest.firstName} {guest.lastName}
                            </span>
                            {guest.priority && (
                              <span className={`px-1.5 py-0.5 text-xs rounded ${
                                guest.priority === 'high' ? 'bg-green-100 text-green-700' :
                                guest.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {guest.priority}
                              </span>
                            )}
                            {guest.hostingInterest === 'Yes' && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                                Wants to host
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {guest.attendanceCount} dinner{guest.attendanceCount !== 1 ? 's' : ''} attended
                            {guest.email && ` • ${guest.email}`}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Warning for zero attendance */}
            {selectedGuest && selectedGuest.attendanceCount === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <strong>Note:</strong> This guest has not attended any dinners yet. Consider waiting until they&apos;ve experienced a dinner before making them a host.
              </div>
            )}

            {/* Selected Guest Info (read-only) */}
            {selectedGuest && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Selected Guest</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Name:</strong> {selectedGuest.firstName} {selectedGuest.lastName}</div>
                  {selectedGuest.email && <div><strong>Email:</strong> {selectedGuest.email}</div>}
                  {selectedGuest.phone && <div><strong>Phone:</strong> {selectedGuest.phone}</div>}
                </div>
              </div>
            )}

            {/* Host-specific fields */}
            {selectedGuestId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setError(null);
                    }}
                    placeholder="Full address where dinners will be hosted"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setError(null);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Guests</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(parseInt(e.target.value) || DEFAULT_MAX_GUESTS)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional notes about this host..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="text-terracotta focus:ring-terracotta rounded"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Active (available to host dinners)
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !selectedGuestId}
              className="px-4 py-2 text-sm font-medium text-white bg-terracotta rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Host'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

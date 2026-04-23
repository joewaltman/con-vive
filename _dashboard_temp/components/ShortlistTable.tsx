'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ShortlistGuest } from '@/lib/types';
import { DIETARY_RESTRICTIONS_OPTIONS } from '@/lib/constants';

interface ShortlistTableProps {
  guests: ShortlistGuest[];
  dinnerDayOfWeek: string;
  totalSeats: number;
  minPerGender: number;
  onSendInvites: (guestIds: number[]) => Promise<void>;
  isSending: boolean;
  excludeDietary: string[];
  onExcludeDietaryChange: (exclusions: string[]) => void;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: '#22C55E', // green
  2: '#F59E0B', // amber
  3: '#EF4444', // red
};

export default function ShortlistTable({
  guests,
  dinnerDayOfWeek,
  totalSeats,
  minPerGender,
  onSendInvites,
  isSending,
  excludeDietary,
  onExcludeDietaryChange,
}: ShortlistTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Calculate gender breakdown of selected guests
  const genderBreakdown = useMemo(() => {
    const selected = guests.filter(g => selectedIds.has(g.id));
    const males = selected.filter(g => g.gender === 'Male').length;
    const females = selected.filter(g => g.gender === 'Female').length;
    const other = selected.length - males - females;
    return { males, females, other };
  }, [guests, selectedIds]);

  // Check for warnings
  const warnings = useMemo(() => {
    const result: { type: 'error' | 'warning'; message: string }[] = [];

    if (selectedIds.size > 0) {
      if (genderBreakdown.males < minPerGender) {
        result.push({
          type: 'error',
          message: `Only ${genderBreakdown.males} male${genderBreakdown.males !== 1 ? 's' : ''} selected (min: ${minPerGender})`,
        });
      }
      if (genderBreakdown.females < minPerGender) {
        result.push({
          type: 'error',
          message: `Only ${genderBreakdown.females} female${genderBreakdown.females !== 1 ? 's' : ''} selected (min: ${minPerGender})`,
        });
      }
      if (selectedIds.size < totalSeats * 1.5) {
        result.push({
          type: 'warning',
          message: `Inviting ${selectedIds.size} guests for ${totalSeats} seats. Consider inviting 1.5x seats.`,
        });
      }
    }

    return result;
  }, [selectedIds, genderBreakdown, minPerGender, totalSeats]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === guests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(guests.map(g => g.id)));
    }
  }, [guests, selectedIds.size]);

  const handleSendInvites = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await onSendInvites(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds, onSendInvites]);

  const toggleDietaryExclusion = useCallback((restriction: string) => {
    if (excludeDietary.includes(restriction)) {
      onExcludeDietaryChange(excludeDietary.filter(r => r !== restriction));
    } else {
      onExcludeDietaryChange([...excludeDietary, restriction]);
    }
  }, [excludeDietary, onExcludeDietaryChange]);

  return (
    <div className="flex gap-6">
      {/* Main Table */}
      <div className="flex-1 min-w-0">
        {/* Dietary Filter */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500 mb-2">Exclude guests with:</div>
          <div className="flex flex-wrap gap-2">
            {DIETARY_RESTRICTIONS_OPTIONS.filter(r => r !== 'None' && r !== 'Other').map(restriction => (
              <button
                key={restriction}
                onClick={() => toggleDietaryExclusion(restriction)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  excludeDietary.includes(restriction)
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {restriction}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === guests.length && guests.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-terracotta focus:ring-terracotta"
                  />
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Name</th>
                <th className="text-left px-2 py-2 font-medium text-gray-700">Gender</th>
                <th className="text-center px-2 py-2 font-medium text-gray-700 w-12">P</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Solo/Couple</th>
                <th className="text-center px-2 py-2 font-medium text-gray-700 w-12">{dinnerDayOfWeek}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Dietary</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Last Attended</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700 hidden lg:table-cell">Bio</th>
                <th className="w-10 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {guests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No eligible guests found
                  </td>
                </tr>
              ) : (
                guests.map(guest => (
                  <>
                    <tr
                      key={guest.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        selectedIds.has(guest.id) ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(guest.id)}
                          onChange={() => toggleSelect(guest.id)}
                          className="rounded text-terracotta focus:ring-terracotta"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {guest.firstName} {guest.lastName}
                        {!guest.email && (
                          <span className="ml-1 text-xs text-red-500">(no email)</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-gray-600">
                          {guest.gender || '--'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {guest.priority && (
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: PRIORITY_COLORS[guest.priority] || '#9CA3AF' }}
                          >
                            {guest.priority}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {guest.soloOrCouple || '--'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {guest.availableDays?.includes(dinnerDayOfWeek) ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {guest.dietaryRestrictions
                            ?.filter(r => r !== 'None')
                            .slice(0, 2)
                            .map(restriction => (
                              <span
                                key={restriction}
                                className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded"
                              >
                                {restriction}
                              </span>
                            ))}
                          {(guest.dietaryRestrictions?.filter(r => r !== 'None').length || 0) > 2 && (
                            <span className="text-xs text-gray-400">
                              +{(guest.dietaryRestrictions?.filter(r => r !== 'None').length || 0) - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {guest.lastAttendedDate || 'Never'}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs hidden lg:table-cell max-w-xs truncate">
                        {guest.bioSnippet || '--'}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => setExpandedId(expandedId === guest.id ? null : guest.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${expandedId === guest.id ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {expandedId === guest.id && (
                      <tr key={`${guest.id}-expanded`} className="bg-gray-50">
                        <td colSpan={10} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Email:</span>{' '}
                              <span className="text-gray-600">{guest.email || 'Not set'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Spark Score:</span>{' '}
                              <span className="text-gray-600">{guest.sparkScore || '--'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Last Invited:</span>{' '}
                              <span className="text-gray-600">{guest.lastInvitedDate || 'Never'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Available Days:</span>{' '}
                              <span className="text-gray-600">{guest.availableDays?.join(', ') || 'Not set'}</span>
                            </div>
                            {guest.dietaryNotes && (
                              <div className="col-span-2">
                                <span className="font-medium text-gray-700">Dietary Notes:</span>{' '}
                                <span className="text-gray-600">{guest.dietaryNotes}</span>
                              </div>
                            )}
                            {guest.bioSnippet && (
                              <div className="col-span-2">
                                <span className="font-medium text-gray-700">Bio:</span>{' '}
                                <span className="text-gray-600">{guest.bioSnippet}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="sticky top-4 bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Selected</div>
            <div className="text-2xl font-semibold text-gray-900">{selectedIds.size}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Gender Breakdown</div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{genderBreakdown.males}M</span>
              {' / '}
              <span className="font-medium">{genderBreakdown.females}F</span>
              {genderBreakdown.other > 0 && ` / ${genderBreakdown.other} other`}
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((warning, i) => (
                <div
                  key={i}
                  className={`text-xs p-2 rounded ${
                    warning.type === 'error'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {warning.message}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSendInvites}
            disabled={selectedIds.size === 0 || isSending}
            className="w-full px-4 py-2 bg-terracotta text-white text-sm font-medium rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Sending...' : `Send ${selectedIds.size} Invite${selectedIds.size !== 1 ? 's' : ''}`}
          </button>

          <div className="text-xs text-gray-500 text-center">
            {totalSeats} seats total, min {minPerGender} per gender
          </div>
        </div>
      </div>
    </div>
  );
}

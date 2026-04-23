'use client';

import { useState, useCallback } from 'react';
import type { HostFields } from '@/lib/types';
import { DEFAULT_MAX_GUESTS } from '@/lib/constants';

interface HostCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (fields: Partial<HostFields>) => Promise<void>;
}

export default function HostCreateModal({ isOpen, onClose, onCreate }: HostCreateModalProps) {
  const [fields, setFields] = useState<Partial<HostFields>>({
    'First Name': '',
    'Last Name': '',
    'Phone': '',
    'Email': '',
    'Address': '',
    'City': '',
    'Max Guests': DEFAULT_MAX_GUESTS,
    'Active': true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((field: keyof HostFields, value: unknown) => {
    setFields(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fields['First Name']?.trim() || !fields['Last Name']?.trim()) {
      setError('First name and last name are required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreate(fields);
      // Reset form
      setFields({
        'First Name': '',
        'Last Name': '',
        'Phone': '',
        'Email': '',
        'Address': '',
        'City': '',
        'Max Guests': DEFAULT_MAX_GUESTS,
        'Active': true,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create host');
    } finally {
      setIsCreating(false);
    }
  }, [fields, onCreate, onClose]);

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
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={String(fields['First Name'] || '')}
                  onChange={(e) => handleChange('First Name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={String(fields['Last Name'] || '')}
                  onChange={(e) => handleChange('Last Name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={String(fields['Phone'] || '')}
                  onChange={(e) => handleChange('Phone', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={String(fields['Email'] || '')}
                  onChange={(e) => handleChange('Email', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={String(fields['Address'] || '')}
                onChange={(e) => handleChange('Address', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={String(fields['City'] || '')}
                  onChange={(e) => handleChange('City', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Guests</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={Number(fields['Max Guests']) || DEFAULT_MAX_GUESTS}
                  onChange={(e) => handleChange('Max Guests', parseInt(e.target.value) || DEFAULT_MAX_GUESTS)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
            </div>
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
              disabled={isCreating}
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

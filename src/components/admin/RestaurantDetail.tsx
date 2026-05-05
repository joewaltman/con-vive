'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Restaurant, RestaurantFields } from '@/lib/types/admin';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onSave: (id: string, fields: Partial<RestaurantFields>) => Promise<void>;
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function RestaurantDetail({ restaurant, onSave, onBack, showBackButton }: RestaurantDetailProps) {
  const [editedFields, setEditedFields] = useState<Partial<RestaurantFields>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset edited fields when restaurant changes
  useEffect(() => {
    setEditedFields({});
  }, [restaurant.id]);

  const getValue = useCallback((field: keyof RestaurantFields) => {
    if (field in editedFields) {
      return editedFields[field];
    }
    return restaurant.fields[field];
  }, [editedFields, restaurant.fields]);

  const handleChange = useCallback((field: keyof RestaurantFields, value: unknown) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (Object.keys(editedFields).length === 0) return;

    setIsSaving(true);
    try {
      await onSave(restaurant.id, editedFields);
      setEditedFields({});
    } finally {
      setIsSaving(false);
    }
  }, [restaurant.id, editedFields, onSave]);

  const hasChanges = Object.keys(editedFields).length > 0;

  const inputClass = (field: keyof RestaurantFields) => `
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
                {restaurant.fields['Name']}
              </h2>
              <p className="text-sm text-gray-500">
                {restaurant.dinnerCount || 0} dinner{(restaurant.dinnerCount || 0) !== 1 ? 's' : ''} hosted
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
            <div>
              <label className="block text-xs text-gray-500 mb-1">Restaurant Name</label>
              <input
                type="text"
                value={String(getValue('Name') || '')}
                onChange={(e) => handleChange('Name', e.target.value)}
                className={inputClass('Name')}
              />
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
                <label className="block text-xs text-gray-500 mb-1">Website</label>
                <input
                  type="url"
                  value={String(getValue('Website') || '')}
                  onChange={(e) => handleChange('Website', e.target.value)}
                  placeholder="https://..."
                  className={inputClass('Website')}
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

          {/* Status */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
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
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Dinner History</h3>
            {restaurant.dinnerCount === 0 ? (
              <p className="text-sm text-gray-500">No dinners hosted yet</p>
            ) : (
              <p className="text-sm text-gray-500">
                {restaurant.dinnerCount} dinner{restaurant.dinnerCount !== 1 ? 's' : ''} hosted.{' '}
                <a href="/admin/dinners" className="text-terracotta hover:underline">
                  View all dinners
                </a>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Guest, GuestFields, Message } from '@/lib/types';
import {
  AGE_RANGE_OPTIONS,
  GENDER_OPTIONS,
  SOLO_OR_COUPLE_OPTIONS,
  AVAILABLE_DAYS_OPTIONS,
  DIETARY_RESTRICTIONS_OPTIONS,
  HOSTING_INTEREST_OPTIONS,
} from '@/lib/constants';
import MessageThread from './MessageThread';
import MessageCompose from './MessageCompose';
import SocialEnrichment from './SocialEnrichment';
import NeedsAttentionBanner from './NeedsAttentionBanner';

interface GuestDetailProps {
  guest: Guest;
  onSave: (id: string, fields: Partial<GuestFields>) => Promise<void>;
  onBack?: () => void;
  showBackButton?: boolean;
}

type FieldKey = keyof GuestFields;

export default function GuestDetail({ guest, onSave, onBack, showBackButton }: GuestDetailProps) {
  const [editedFields, setEditedFields] = useState<Partial<GuestFields>>({});
  const [saving, setSaving] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);

  // Reset edited fields when guest changes
  useEffect(() => {
    setEditedFields({});
  }, [guest.id]);

  const hasChanges = Object.keys(editedFields).length > 0;

  const getValue = useCallback((key: FieldKey) => {
    if (key in editedFields) {
      return editedFields[key];
    }
    return guest.fields[key];
  }, [editedFields, guest.fields]);

  const isModified = useCallback((key: FieldKey) => {
    return key in editedFields;
  }, [editedFields]);

  const handleChange = useCallback((key: FieldKey, value: GuestFields[FieldKey]) => {
    const originalValue = guest.fields[key];

    // Check if value is same as original
    if (JSON.stringify(value) === JSON.stringify(originalValue)) {
      // Remove from edited fields
      setEditedFields(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setEditedFields(prev => ({ ...prev, [key]: value }));
    }
  }, [guest.fields]);

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      await onSave(guest.id, editedFields);
      setEditedFields({});
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (key: FieldKey) => `
    w-full px-3 py-2 text-sm border rounded-lg transition-colors
    ${isModified(key)
      ? 'border-amber-400 bg-amber-50'
      : 'border-gray-300 bg-white'
    }
    focus:ring-1 focus:ring-terracotta focus:border-terracotta
  `;

  const firstName = getValue('First Name') as string || '';
  const lastName = getValue('Last Name') as string || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Unnamed Guest';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {fullName}
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Needs Attention Banner */}
        <NeedsAttentionBanner
          guestId={guest.id}
          guestName={firstName}
        />

        {/* Identity Section */}
        <Section title="Identity">
          <FieldRow>
            <Field label="First Name">
              <input
                type="text"
                value={getValue('First Name') as string || ''}
                onChange={(e) => handleChange('First Name', e.target.value)}
                className={inputClass('First Name')}
              />
            </Field>
            <Field label="Last Name">
              <input
                type="text"
                value={getValue('Last Name') as string || ''}
                onChange={(e) => handleChange('Last Name', e.target.value)}
                className={inputClass('Last Name')}
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Email">
              <input
                type="email"
                value={getValue('Email') as string || ''}
                onChange={(e) => handleChange('Email', e.target.value)}
                className={inputClass('Email')}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={getValue('Phone') as string || ''}
                onChange={(e) => handleChange('Phone', e.target.value)}
                className={inputClass('Phone')}
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Gender">
              <select
                value={getValue('Gender') as string || ''}
                onChange={(e) => handleChange('Gender', e.target.value)}
                className={inputClass('Gender')}
              >
                <option value="">Select...</option>
                {GENDER_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </Field>
            <Field label="Age Range">
              <select
                value={getValue('Age Range') as string || ''}
                onChange={(e) => handleChange('Age Range', e.target.value)}
                className={inputClass('Age Range')}
              >
                <option value="">Select...</option>
                {AGE_RANGE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </Field>
          </FieldRow>
          <Field label="Zip Code">
            <input
              type="text"
              value={getValue('Zip Code') as string || ''}
              onChange={(e) => handleChange('Zip Code', e.target.value)}
              className={inputClass('Zip Code')}
              placeholder="e.g., 92024"
            />
          </Field>
        </Section>

        {/* Vetting Section */}
        <Section title="Vetting">
          <FieldRow>
            <Field label="Call Complete">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={getValue('Call Complete') as boolean || false}
                  onChange={(e) => handleChange('Call Complete', e.target.checked)}
                  className={`rounded border-gray-300 text-terracotta focus:ring-terracotta ${isModified('Call Complete') ? 'border-amber-400' : ''}`}
                />
                <span className="text-sm text-gray-600">Completed</span>
              </label>
            </Field>
            <Field label="Call Date">
              <input
                type="date"
                value={getValue('Call Date') as string || ''}
                onChange={(e) => handleChange('Call Date', e.target.value)}
                className={inputClass('Call Date')}
              />
            </Field>
          </FieldRow>
          <Field label="Priority">
            <input
              type="text"
              value={getValue('Priority') as string || ''}
              onChange={(e) => handleChange('Priority', e.target.value)}
              className={inputClass('Priority')}
            />
          </Field>
        </Section>

        {/* Guest Profile Section */}
        <Section title="Guest Profile">
          <Field label="Curious About">
            <textarea
              rows={3}
              value={getValue('Curious About') as string || ''}
              onChange={(e) => handleChange('Curious About', e.target.value)}
              className={inputClass('Curious About')}
            />
          </Field>
        </Section>

        {/* Logistics Section */}
        <Section title="Logistics">
          <Field label="Solo or Couple">
            <select
              value={getValue('Solo or Couple') as string || ''}
              onChange={(e) => handleChange('Solo or Couple', e.target.value)}
              className={inputClass('Solo or Couple')}
            >
              <option value="">Select...</option>
              {SOLO_OR_COUPLE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </Field>
          <Field label="Available Days">
            <MultiSelect
              options={AVAILABLE_DAYS_OPTIONS as unknown as string[]}
              value={getValue('Available Days') as string[] || []}
              onChange={(value) => handleChange('Available Days', value)}
              isModified={isModified('Available Days')}
            />
          </Field>
          <Field label="Dietary Restrictions">
            <MultiSelect
              options={DIETARY_RESTRICTIONS_OPTIONS as unknown as string[]}
              value={getValue('Dietary Restrictions') as string[] || []}
              onChange={(value) => handleChange('Dietary Restrictions', value)}
              isModified={isModified('Dietary Restrictions')}
            />
          </Field>
          <Field label="Dietary Notes">
            <input
              type="text"
              value={getValue('Dietary Notes') as string || ''}
              onChange={(e) => handleChange('Dietary Notes', e.target.value)}
              className={inputClass('Dietary Notes')}
            />
          </Field>
          <Field label="Hosting Interest">
            <select
              value={getValue('Hosting Interest') as string || ''}
              onChange={(e) => handleChange('Hosting Interest', e.target.value)}
              className={inputClass('Hosting Interest')}
            >
              <option value="">Select...</option>
              {HOSTING_INTEREST_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Call Notes Section */}
        <Section title="Call Notes">
          <Field label="Summarized Transcript">
            <textarea
              rows={8}
              value={getValue('Summarized Transcript') as string || ''}
              onChange={(e) => handleChange('Summarized Transcript', e.target.value)}
              className={inputClass('Summarized Transcript')}
            />
          </Field>
        </Section>

        {/* Social Enrichment Section */}
        <Section title="Social Enrichment">
          <SocialEnrichment
            guestId={guest.id}
            existingSummary={guest.fields['Social Summary']}
            hasEnoughDataForQuestions={Boolean(
              guest.fields['OneThing'] ||
              guest.fields['About'] ||
              guest.fields['Curious About'] ||
              guest.fields['Surprising Knowledge'] ||
              guest.fields['What Do You Do'] ||
              guest.fields['Summarized Transcript']
            )}
          />
        </Section>

        {/* Messages Section */}
        <Section title="Messages">
          <MessageThread
            guestId={guest.id}
            optimisticMessage={optimisticMessage}
          />
          <div className="mt-4">
            <MessageCompose
              guestId={guest.id}
              routingStatus={guest.fields['Routing Status']}
              onOptimisticMessage={setOptimisticMessage}
            />
          </div>
        </Section>
      </div>

      {/* Save Button */}
      <div className="p-4 border-t border-gray-200 bg-white shrink-0">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`
            w-full py-2.5 px-4 rounded-lg font-medium transition-colors
            ${hasChanges
              ? 'bg-terracotta hover:bg-terracotta-dark text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3">{children}</div>
  );
}

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  isModified: boolean;
}

function MultiSelect({ options, value, onChange, isModified }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 text-sm text-left border rounded-lg transition-colors
          ${isModified ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}
          focus:ring-1 focus:ring-terracotta focus:border-terracotta
        `}
      >
        {value.length === 0 ? (
          <span className="text-gray-400">Select...</span>
        ) : (
          <span className="text-gray-900">{value.join(', ')}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map(option => (
            <label
              key={option}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={() => toggleOption(option)}
                className="rounded border-gray-300 text-terracotta focus:ring-terracotta"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

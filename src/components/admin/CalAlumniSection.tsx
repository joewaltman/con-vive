'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface CalGuest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_clean: string | null;
  external_signup_data: {
    graduation_year?: number;
    major?: string;
  } | null;
}

interface WaitlistEntry {
  id: number;
  position: number;
  guest: CalGuest;
}

interface CalAlumniData {
  guests: CalGuest[];
  waitlist: WaitlistEntry[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface CalAlumniSectionProps {
  dinnerId: string;
}

export default function CalAlumniSection({ dinnerId }: CalAlumniSectionProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const { data, error, isLoading } = useSWR<CalAlumniData>(
    `/api/admin/dinners/${dinnerId}/cal-alumni`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleCopyList = () => {
    if (!data?.guests) return;

    const lines = data.guests.map((g) => {
      const year = g.external_signup_data?.graduation_year;
      const major = g.external_signup_data?.major;
      const classOf = year ? `, Class of ${year}` : '';
      const majorStr = major ? `, ${major}` : '';
      return `${g.first_name} ${g.last_name}${classOf}${majorStr}`;
    });

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-red-600">Failed to load Cal Alumni data</p>
      </div>
    );
  }

  const guests = data?.guests || [];
  const waitlist = data?.waitlist || [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="font-medium text-gray-900">Cal Alumni Signups</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {guests.length} confirmed{waitlist.length > 0 ? `, ${waitlist.length} on waitlist` : ''}
          </p>
        </div>
        {guests.length > 0 && (
          <button
            onClick={handleCopyList}
            className="px-3 py-1.5 text-sm font-medium text-terracotta border border-terracotta rounded-lg hover:bg-terracotta hover:text-white transition-colors"
          >
            {copySuccess ? 'Copied!' : 'Copy list for chapter'}
          </button>
        )}
      </div>

      {/* Confirmed Guests */}
      <div className="divide-y divide-gray-100">
        {guests.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">
            No confirmed Cal Alumni signups yet.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grad Year
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Major
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {guest.first_name} {guest.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {guest.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {guest.phone_clean || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {guest.external_signup_data?.graduation_year || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {guest.external_signup_data?.major || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <>
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900 text-sm">Waitlist</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grad Year
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Major
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {waitlist.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {entry.position}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {entry.guest.first_name} {entry.guest.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.guest.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.guest.external_signup_data?.graduation_year || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.guest.external_signup_data?.major || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

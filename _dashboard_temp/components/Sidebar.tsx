'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { COLORS } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch attention count for badge
  const { data: attentionData } = useSWR<{ count: number }>(
    '/api/attention/count',
    fetcher,
    {
      refreshInterval: 60000, // Poll every 60 seconds
      revalidateOnFocus: false,
    }
  );

  const attentionCount = attentionData?.count ?? 0;

  const navItems = [
    { name: 'Guests', shortName: 'G', href: '/', active: pathname === '/' },
    { name: 'Needs Attention', shortName: '!', href: '/attention', active: pathname === '/attention', badge: attentionCount },
    { name: 'Dinners', shortName: 'D', href: '/dinners', active: pathname.startsWith('/dinners') },
    { name: 'Hosts', shortName: 'H', href: '/hosts', active: pathname === '/hosts' },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="w-16 lg:w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-terracotta hidden lg:block">
          Con-Vive
        </h1>
        <span className="text-xl font-semibold text-terracotta lg:hidden block text-center">
          CV
        </span>
      </div>

      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`
              flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors
              ${item.active
                ? 'bg-terracotta/10 text-terracotta'
                : 'text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <span className="hidden lg:inline">{item.name}</span>
            <span className="lg:hidden text-center w-full">
              {item.shortName}
            </span>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className="hidden lg:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium text-white rounded-full"
                style={{ backgroundColor: COLORS.terracotta }}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </a>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <span className="hidden lg:inline">
            {loggingOut ? 'Logging out...' : 'Log Out'}
          </span>
          <span className="lg:hidden text-center w-full">
            {loggingOut ? '...' : '←'}
          </span>
        </button>
      </div>
    </aside>
  );
}

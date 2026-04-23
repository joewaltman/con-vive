'use client';

import { Suspense, use } from 'react';
import Sidebar from '@/components/Sidebar';
import DinnerDetail from '@/components/DinnerDetail';

interface DinnerPageProps {
  params: Promise<{ id: string }>;
}

function DinnerPageContent({ params }: DinnerPageProps) {
  const { id } = use(params);

  return (
    <div className="h-screen flex overflow-hidden bg-cream">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <DinnerDetail dinnerId={id} />
      </main>
    </div>
  );
}

export default function DinnerPage(props: DinnerPageProps) {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <DinnerPageContent {...props} />
    </Suspense>
  );
}

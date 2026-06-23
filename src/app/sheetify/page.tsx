'use client';

import dynamic from 'next/dynamic';

const SheetifyApp = dynamic(() => import('./SheetifyApp'), { ssr: false });

export default function SheetifyPage() {
  return <SheetifyApp />;
}

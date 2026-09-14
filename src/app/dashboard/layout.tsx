import type { Metadata } from 'next';

// Password-protected internal tool — keep it out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}

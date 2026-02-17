import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SiteDoc — Automated Site Monitoring',
  description: 'AI-powered site issue detection and remediation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} h-full`}
        style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
      >
        {children}
      </body>
    </html>
  );
}

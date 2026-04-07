import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: {
    default: 'Teeworld AI Agents - Quản lý Doanh nghiệp Thông minh',
    template: '%s | Teeworld AI Agents',
  },
  description: '11 AI Agents vận hành doanh nghiệp graphic tees: CEO, HR, CFO, Strategy, Market Research, Channel Optimizer, và hơn nữa. Target 20 tỷ VND/năm.',
  keywords: ['AI agents', 'business management', 'graphic tees', 'Teeworld', 'HR system', 'multi-agent'],
  authors: [{ name: 'Teeworld' }],
  metadataBase: new URL('https://teeworld-hr.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Teeworld AI Agents',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} antialiased`}>
      <body className="bg-slate-50/50">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "HR System - Hệ thống quản lý nhân sự",
  description: "Hệ thống chấm công và quản lý nhân sự tổng hợp",
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

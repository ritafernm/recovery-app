import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import NavAuth from "@/components/NavAuth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RecoveryApp",
  description: "Track and manage your recovery journey",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--color-surface)] text-[var(--color-text-primary)]">
        <Nav authSlot={<NavAuth />} />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}

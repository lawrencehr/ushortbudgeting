import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Drama Budget App",
  description: "Short-Form Drama Budgeting Application",
};

import ProjectHeader from "@/components/ProjectHeader";
import AppSidebar from "@/components/AppSidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} h-screen flex flex-col overflow-hidden`}>
        <header className="bg-slate-900 text-white shadow-md flex-shrink-0 z-30">
          <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="text-xl">🎬</span>
              <h1 className="text-lg font-bold tracking-tight text-slate-100">ShortKingz <span className="text-slate-400 font-normal">Production Budget</span></h1>
            </div>
            <nav className="space-x-1 flex text-sm">
              <Link href="/" className="px-3 py-2 rounded hover:bg-slate-800 transition-colors">Dashboard</Link>
              <Link href="/budget" className="px-3 py-2 rounded hover:bg-slate-800 transition-colors bg-slate-800 text-white">Budget</Link>
              <Link href="/crew" className="px-3 py-2 rounded hover:bg-slate-800 transition-colors">Crew</Link>
              <Link href="/settings" className="px-3 py-2 rounded hover:bg-slate-800 transition-colors">Settings</Link>
            </nav>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />

          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <ProjectHeader />
            <main className="flex-1 overflow-auto bg-gray-50 relative">
              <div className="container mx-auto p-6 max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

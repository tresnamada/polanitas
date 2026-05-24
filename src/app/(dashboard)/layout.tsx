import type { Metadata } from "next";
import Link from "next/link";
import { ThemeLogo } from "@/components/layout/ThemeLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { UserChip } from "@/components/layout/UserChip";
import "../globals.css";

import { BottomNav } from "@/components/layout/BottomNav";
import { SpeechToAction } from "@/components/accessibility/SpeechToAction";
import { EyeTrackingNavigation } from "@/components/accessibility/EyeTrackingNavigation";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <Link href="/dashboard" className="flex items-center no-underline">
          <ThemeLogo height={28} />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserChip />
          <SignOutButton />
        </div>
      </header>

      {/* Sidebar */}
      <aside className="app-sidebar">
        <SidebarNav />
      </aside>

      {/* Main content */}
      <main className="app-main">{children}</main>

      {/* Mobile Nav */}
      <BottomNav />

      {/* Accessibility Widgets (each manages its own fixed position) */}
      <EyeTrackingNavigation />
      <SpeechToAction />
    </div>
  );
}

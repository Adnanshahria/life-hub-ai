import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AIChatInterface } from "../ai/AIChatInterface";
import { GlobalSearch } from "../ui/GlobalSearch";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main content */}
      <main className="md:ml-64 min-h-screen pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pt-20 sm:pt-24 md:pt-6 pb-8">
          {children}
        </div>
      </main>

      {/* AI Chat Interface */}
      <AIChatInterface />
      <GlobalSearch />

      {/* Bottom Nav - Mobile only */}
      <BottomNav />
    </div>
  );
}

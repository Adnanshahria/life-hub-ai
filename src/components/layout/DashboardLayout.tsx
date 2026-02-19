import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AIChatInterface } from "../ai/AIChatInterface";
import { GlobalSearch } from "../ui/GlobalSearch";
import { AnimatedPage } from "./AnimatedPage";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export function DashboardLayout() {
    const location = useLocation();

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
                <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-6 pb-8">
                    <AnimatePresence mode="wait">
                        <AnimatedPage key={location.pathname}>
                            <Outlet />
                        </AnimatedPage>
                    </AnimatePresence>
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

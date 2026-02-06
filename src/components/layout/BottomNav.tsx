import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  Wallet,
  StickyNote,
  Target,
  Settings,
  Moon,
  Sun,
  MoreHorizontal,
  Package,
  GraduationCap,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: ListTodo, label: "Tasks", path: "/tasks" },
  { icon: Wallet, label: "Finance", path: "/finance" },
  { icon: StickyNote, label: "Notes", path: "/notes" },
];

const moreNavItems = [
  { icon: Target, label: "Habits", path: "/habits" },
  { icon: Package, label: "Inventory", path: "/inventory" },
  { icon: GraduationCap, label: "Study", path: "/study" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function BottomNav() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-20 left-4 right-4 glass-card rounded-2xl p-4 z-50 md:hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">More Options</h3>
                <button onClick={() => setShowMore(false)} className="p-1 hover:bg-secondary rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {moreNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMore(false)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${isActive ? "bg-primary/20 text-primary" : "hover:bg-secondary text-muted-foreground"
                        }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              {/* Theme Toggle */}
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="w-5 h-5 text-yellow-400" />
                      <span className="text-sm font-medium">Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-medium">Dark Mode</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="relative">
                <motion.div
                  className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  whileTap={{ scale: 0.9 }}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -bottom-1 w-8 h-1 bg-gradient-primary rounded-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
          {/* More Button */}
          <button onClick={() => setShowMore(true)} className="relative">
            <motion.div
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${showMore ? "text-primary" : "text-muted-foreground"
                }`}
              whileTap={{ scale: 0.9 }}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-xs font-medium">More</span>
            </motion.div>
          </button>
        </div>
      </nav>
    </>
  );
}

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Moon,
  Sun,
  MoreHorizontal,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { useNavPreferences } from "@/hooks/useNavPreferences";

export function BottomNav() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const { mainNavItems, moreNavItems } = useNavPreferences();

  // Check if any "more" item is active
  const isMoreActive = moreNavItems.some(item => location.pathname === item.path);

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
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-24 left-4 right-4 glass-card rounded-2xl p-4 z-50 md:hidden shadow-2xl shadow-black/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">More Options</h3>
                <button onClick={() => setShowMore(false)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
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
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${isActive
                          ? "bg-primary/15 text-primary shadow-sm"
                          : "hover:bg-secondary text-muted-foreground"
                        }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              {/* Theme Toggle */}
              <div className="mt-4 pt-3 border-t border-border/50">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium">Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">Dark Mode</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="floating-nav-container">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="relative">
                <motion.div
                  className={`floating-nav-item ${isActive ? "active" : ""}`}
                  whileTap={{ scale: 0.92 }}
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.span
                        key={item.label}
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="text-xs font-semibold overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
          {/* More Button */}
          <button onClick={() => setShowMore(!showMore)} className="relative">
            <motion.div
              className={`floating-nav-item ${showMore || isMoreActive ? "active" : ""}`}
              whileTap={{ scale: 0.92 }}
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <MoreHorizontal className="w-[18px] h-[18px]" />
              <AnimatePresence mode="wait">
                {(showMore || isMoreActive) && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="text-xs font-semibold overflow-hidden whitespace-nowrap"
                  >
                    More
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </button>
        </div>
      </nav>
    </>
  );
}

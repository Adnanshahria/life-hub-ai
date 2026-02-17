import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  Wallet,
  StickyNote,
  Package,
  GraduationCap,
  Target,
  Sparkles,
  Settings,
  Moon,
  Sun,
  LogOut,
  User
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ListTodo, label: "Tasks", path: "/tasks" },
  { icon: Wallet, label: "Finance", path: "/finance" },
  { icon: StickyNote, label: "Notes", path: "/notes" },
  { icon: Package, label: "Inventory", path: "/inventory" },
  { icon: GraduationCap, label: "Study", path: "/study" },
  { icon: Target, label: "Habits", path: "/habits" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 glass-card rounded-none border-l-0 border-t-0 border-b-0 p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="w-10 h-10 rounded-xl overflow-hidden">
          <img src="/logo.svg" alt="LifeOS" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gradient">LifeOS</h1>
          <p className="text-xs text-muted-foreground">AI Command Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={`nav-item ${isActive ? "active" : ""}`}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-6 bg-gradient-primary rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      {user && (
        <div className="py-4 border-t border-border mb-2">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom section */}
      <div className="space-y-2 pt-4 border-t border-border">
        <button
          onClick={toggleTheme}
          className="nav-item w-full"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          <span className="font-medium">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        <Link to="/settings">
          <div className="nav-item">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

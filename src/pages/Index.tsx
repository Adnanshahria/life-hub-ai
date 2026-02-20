import { useEffect, useMemo, useState } from "react";
import { SEO } from "@/components/seo/SEO";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ListTodo, Target, TrendingUp, CalendarDays, PiggyBank,
  BookOpen, Flame, BarChart3, Activity, ArrowUpRight, ArrowDownRight,
  GraduationCap, CheckCircle2, Clock, Zap, Brain, Sparkles, Loader2,
  AlertCircle, Lightbulb, ChevronRight, MoreHorizontal, Eye, ChevronDown
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/hooks/useTheme";
import { useFinance } from "@/hooks/useFinance";
import { useBudget } from "@/hooks/useBudget";
import { useTasks } from "@/hooks/useTasks";
import { useHabits } from "@/hooks/useHabits";
import { useStudy } from "@/hooks/useStudy";
import { useNotes } from "@/hooks/useNotes";
import { useAuth } from "@/contexts/AuthContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { callGroqAPI } from "@/ai/core/groq-client";

// Color palette
const CATEGORY_COLORS: Record<string, string> = {
  "Food": "#06d6a0", "Transport": "#118ab2", "Entertainment": "#ffd166",
  "Bills": "#8338ec", "Shopping": "#ef476f", "Health": "#26de81",
  "Education": "#4ecdc4", "Other": "#95a5a6",
};

// Animated radial ring
function RadialProgress({ progress, size = 52, strokeWidth = 5, color = "#00D4AA", children }: {
  progress: number; size?: number; strokeWidth?: number; color?: string; children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const c = r * 2 * Math.PI;
  const o = c - (Math.min(100, Math.max(0, progress)) / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
          strokeWidth={strokeWidth} className="text-muted-foreground/10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={o}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}

// Stagger children animation wrapper
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const CollapsibleContent = ({ isExpanded, isMobile, children }: { isExpanded: boolean, isMobile: boolean, children: React.ReactNode }) => (
  <AnimatePresence>
    {(!isMobile || isExpanded) && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

const ExpandButton = ({ isExpanded, onClick, isMobile }: { isExpanded: boolean, onClick: () => void, isMobile: boolean }) => isMobile ? (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-2"
  >
    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
  </button>
) : null;


const Index = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Mobile check and expand state
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "activity": true,
    "spending": true,
    "tasks": true,
    "habits": true,
    "study": true,
    "transactions": true,
    "ai_summary": true
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { balance, totalIncome, totalExpenses, expensesByCategory, expenses, regularEntries } = useFinance();
  const { totalSavings, budgetRemaining, primaryBudget, savingsGoals } = useBudget();
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { chapters, subjects, subjectProgress, chapterProgress } = useStudy();
  const { notes } = useNotes();

  useEffect(() => { document.documentElement.classList.add(theme); }, []);

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // ===== TASK ANALYTICS =====
  const allTasks = tasks || [];
  const todayStr = new Date().toISOString().split("T")[0];
  const todaysTasks = allTasks.filter(t => t.due_date?.split("T")[0] === todayStr);
  const pendingTasks = allTasks.filter(t => t.status !== "done");
  const completedTasks = allTasks.filter(t => t.status === "done");
  const highPriorityTasks = pendingTasks.filter(t => t.priority === "high" || t.priority === "urgent");
  const taskCompletionRate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

  // ===== HABIT ANALYTICS =====
  const allHabits = habits || [];
  const habitsCompletedToday = allHabits.filter(h => {
    if (!h.last_completed_date) return false;
    return h.last_completed_date.split("T")[0] === todayStr;
  }).length;
  const habitCompletionRate = allHabits.length > 0 ? Math.round((habitsCompletedToday / allHabits.length) * 100) : 0;
  const bestStreak = allHabits.length > 0 ? Math.max(...allHabits.map(h => h.streak_count), 0) : 0;

  // ===== STUDY ANALYTICS =====
  const allChapters = chapters || [];
  const completedChapters = allChapters.filter(c => (chapterProgress[c.id] || 0) === 100).length;
  const studyProgress = allChapters.length > 0 ? Math.round(allChapters.reduce((s, c) => s + (chapterProgress[c.id] || 0), 0) / allChapters.length) : 0;
  const subjectProgressList = (subjects || []).map(s => ({ subject: s.name, progress: subjectProgress[s.id] || 0 })).sort((a, b) => b.progress - a.progress);

  // ===== FINANCE ANALYTICS =====
  const thisMonthExpenses = (regularEntries || []).filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return e.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const lastMonthExpenses = (regularEntries || []).filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return e.type === "expense" && d.getMonth() === lastMonth && d.getFullYear() === lastYear;
  });
  const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const expenseTrend = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0;

  // Expense chart data
  const expenseChartData = Object.entries(expensesByCategory || {}).map(([name, value]) => ({
    name, value, color: CATEGORY_COLORS[name] || CATEGORY_COLORS["Other"],
  }));

  const formatCurrency = (amount: number) => `৳${Math.abs(amount).toLocaleString()}`;
  const recentTransactions = (regularEntries || []).slice(0, 5);

  // Format date safely
  const formatTaskDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T00:00:00");
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch { return ""; }
  };

  // ===== AI SUMMARY =====
  const [aiSummary, setAiSummary] = useState<{ summary: string; alerts: string[]; tips: string[] } | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("lifeos-daily-summary");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === todayStr) setAiSummary(parsed.data);
      } catch { }
    }
  }, []);

  const generateAISummary = async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    try {
      const contextPrompt = `You are an intelligent daily briefing AI for a personal life management app called LifeSolver. Analyze ALL of the user's data below and generate a concise, actionable daily summary.

Today's Date: ${today}
Time: ${new Date().toLocaleTimeString()}

=== TASKS (${allTasks.length} total, ${completedTasks.length} completed, ${pendingTasks.length} pending) ===
High Priority: ${highPriorityTasks.map(t => t.title).join(', ') || 'None'}
Pending Tasks: ${pendingTasks.slice(0, 8).map(t => `"${t.title}" [${t.priority}] due:${t.due_date || 'none'}`).join('; ') || 'None'}

=== HABITS (${allHabits.length} total, ${habitsCompletedToday}/${allHabits.length} done today) ===
${allHabits.map(h => `${h.habit_name}: streak=${h.streak_count}, done_today=${h.last_completed_date?.startsWith(todayStr) ? 'yes' : 'no'}`).join('\n') || 'No habits'}

=== FINANCE ===
Balance: ৳${balance}
This Month Spending: ৳${thisMonthTotal}
Budget Remaining: ৳${budgetRemaining}
Total Savings: ৳${totalSavings}
Top Expense Categories: ${expenseChartData.slice(0, 3).map(c => `${c.name}=৳${c.value}`).join(', ') || 'None'}

=== STUDY (${studyProgress}% overall) ===
${subjectProgressList.slice(0, 5).map(s => `${s.subject}: ${s.progress}%`).join(', ') || 'No study data'}

=== NOTES (${(notes || []).length} total) ===
${(notes || []).slice(0, 5).map(n => `"${n.title}"`).join(', ') || 'No notes'}

Respond in this EXACT JSON format:
{
  "summary": "A 2-3 sentence overview of the user's day so far and what they should focus on",
  "alerts": ["important warnings or overdue items - max 3 items"],
  "tips": ["actionable suggestions based on their data - max 3 items"]
}`;

      const response = await callGroqAPI([
        { role: "system", content: contextPrompt },
        { role: "user", content: "Generate my daily AI briefing summary." }
      ], { temperature: 0.5, maxTokens: 512 });

      const parsed = JSON.parse(response);
      const summaryData = {
        summary: parsed.summary || "No summary available.",
        alerts: parsed.alerts || [],
        tips: parsed.tips || [],
      };
      setAiSummary(summaryData);
      localStorage.setItem("lifeos-daily-summary", JSON.stringify({ date: todayStr, data: summaryData }));
    } catch (err) {
      console.error("AI Summary error:", err);
      setSummaryError("Failed to generate summary. Check your API key.");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Stat card data
  const statCards = [
    {
      icon: Target, label: "Budget Left", value: `৳${budgetRemaining.toLocaleString()}`,
      sub: primaryBudget?.name || "No budget",
      accent: "#f59e0b", gradient: "from-amber-500/20 via-amber-400/10 to-yellow-500/5",
      borderColor: "border-amber-200 dark:border-amber-500/25",
      trend: budgetRemaining >= 0 ? { value: Math.round((budgetRemaining / (primaryBudget?.target_amount || 1)) * 100), up: true } : null,
    },
    {
      icon: PiggyBank, label: "Total Savings", value: `৳${totalSavings.toLocaleString()}`,
      sub: `${savingsGoals.length} goal(s)`,
      accent: "#10b981", gradient: "from-emerald-500/20 via-emerald-400/10 to-green-500/5",
      borderColor: "border-emerald-200 dark:border-emerald-500/25",
      trend: null,
      className: "hidden sm:block",
    },
    {
      icon: Wallet, label: "Balance", value: `${balance >= 0 ? "" : "-"}${formatCurrency(balance)}`,
      sub: `Income: ৳${totalIncome.toLocaleString()}`,
      accent: "#3b82f6", gradient: "from-blue-500/20 via-blue-400/10 to-sky-500/5",
      borderColor: "border-blue-200 dark:border-blue-500/25",
      trend: balance >= 0 ? { value: Math.round((balance / (totalIncome || 1)) * 100), up: true } : null,
      className: "hidden sm:block",
    },
    {
      icon: ListTodo, label: "Pending Tasks", value: String(pendingTasks.length),
      sub: `${highPriorityTasks.length} high priority`,
      accent: "#ef4444", gradient: "from-rose-500/20 via-rose-400/10 to-pink-500/5",
      borderColor: "border-rose-200 dark:border-rose-500/25",
      trend: null,
    },
  ];

  return (
    <AppLayout className="!pt-6 sm:!pt-8 md:pt-6">
      <SEO title="Dashboard" description="Overview of your tasks, finance, habits, and study progress." />

      {/* ===== HEADER ===== */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 md:mb-8">
        {/* Mobile Header Card */}
        <div className="block md:hidden">
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 text-white shadow-lg shadow-indigo-500/25 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -ml-12 -mb-12"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/80 text-xs font-medium mb-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{today}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                {greeting}, <span className="text-white">{user?.name?.split(" ")[0] || "User"}</span>
              </h1>
              <p className="text-white/70 text-xs">Here's your daily snapshot</p>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <div className="rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-card/80 to-transparent backdrop-blur-sm p-6 sm:p-8 relative overflow-hidden shadow-sm">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2 font-medium">
                <CalendarDays className="w-4 h-4 text-primary/70" />
                <span>{today}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                {greeting}, <span className="text-gradient">{user?.name?.split(" ")[0] || "User"}</span>
              </h1>
              <p className="text-muted-foreground text-sm">{aiSummary?.summary ? aiSummary.summary : "Here's your daily snapshot"}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== STAT CARDS ===== */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-3 mb-3 sm:mb-6">
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}
            className={`group relative overflow-hidden rounded-lg sm:rounded-2xl p-2 sm:p-4 bg-gradient-to-br ${stat.gradient} border-2 ${stat.borderColor} hover:shadow-xl transition-all duration-300 cursor-default ${stat.className || ""}`}
          >
            {/* Glow orb */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-25 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
              style={{ backgroundColor: stat.accent }} />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-1.5 sm:mb-3">
                <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm" style={{ backgroundColor: `${stat.accent}25`, boxShadow: `0 2px 8px ${stat.accent}15` }}>
                  <stat.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" style={{ color: stat.accent }} />
                </div>
                {stat.trend && (
                  <Badge variant="outline" className="text-[8px] sm:text-[10px] h-4 sm:h-5 font-semibold" style={{ borderColor: `${stat.accent}40`, color: stat.accent }}>
                    {stat.trend.up ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />}
                    {stat.trend.value}%
                  </Badge>
                )}
              </div>
              <h3 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight">{stat.value}</h3>
              <p className="text-[9px] sm:text-xs mt-0.5 font-semibold" style={{ color: stat.accent }}>{stat.label}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 mt-0.5 hidden sm:block">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ===== BENTO GRID ===== */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 mb-4 sm:mb-6"
      >

        {/* ── AI Summary (span 8) ── */}
        <motion.div variants={fadeUp} className="lg:col-span-8 order-1">
          <div className="rounded-xl sm:rounded-2xl border-2 border-sky-200 dark:border-sky-500/20 bg-gradient-to-br from-sky-50/50 via-card/80 to-indigo-50/30 dark:from-sky-950/20 dark:via-card/80 dark:to-indigo-950/10 backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden h-full">
            {/* Background accents */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[80px] opacity-20"
              style={{ background: "linear-gradient(135deg, #38bdf8, #6366f1)" }} />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-[60px] opacity-10"
              style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/10">
                    <Brain className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Orbit AI Summary</h3>
                    <p className="text-[10px] text-muted-foreground">Your intelligent daily briefing</p>
                  </div>
                </div>
                <button
                  onClick={generateAISummary}
                  disabled={isSummaryLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 disabled:opacity-50
                    bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSummaryLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> {aiSummary ? "Refresh" : "Generate"}</>
                  )}
                </button>
                <ExpandButton isExpanded={!!expandedSections["ai_summary"]} onClick={() => toggleSection("ai_summary")} isMobile={isMobile} />
              </div>

              <CollapsibleContent isExpanded={!!expandedSections["ai_summary"]} isMobile={isMobile}>
                <AnimatePresence mode="wait">
                  {summaryError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="p-3 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 text-sm"
                    >
                      {summaryError}
                    </motion.div>
                  )}

                  {aiSummary ? (
                    <motion.div key="summary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <p className="text-sm text-foreground/80 leading-relaxed">{aiSummary.summary}</p>
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {aiSummary.alerts.length > 0 && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              <span className="text-[11px] font-semibold text-amber-400">Attention</span>
                            </div>
                            <ul className="space-y-0.5">
                              {aiSummary.alerts.map((a, i) => (
                                <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />{a}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSummary.tips.length > 0 && (
                          <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/10">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Lightbulb className="w-3 h-3 text-sky-400" />
                              <span className="text-[11px] font-semibold text-sky-400">Suggestions</span>
                            </div>
                            <ul className="space-y-0.5">
                              {aiSummary.tips.map((t, i) => (
                                <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0" />{t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : !isSummaryLoading && !summaryError && (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-8 text-center"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-sky-400/40" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Click "Generate" for your AI-powered daily briefing</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">Orbit analyzes tasks, habits, finances & study data</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CollapsibleContent>
            </div>
          </div>
        </motion.div>

        {/* ── Monthly Spending (span 4) ── */}
        <motion.div variants={fadeUp} className="lg:col-span-4 order-3 lg:order-2">
          <div className="rounded-xl sm:rounded-2xl border-2 border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-violet-50/40 via-card/80 to-fuchsia-50/20 dark:from-violet-950/20 dark:via-card/80 dark:to-fuchsia-950/10 backdrop-blur-sm p-4 sm:p-5 h-full relative overflow-hidden">
            {/* Glow orb */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-violet-500 opacity-[0.06] blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-500/15 shadow-sm shadow-violet-500/10">
                    <BarChart3 className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Monthly Spending</h3>
                    <p className="text-[10px] text-muted-foreground">This month's overview</p>
                  </div>
                </div>
                <ExpandButton isExpanded={!!expandedSections["spending"]} onClick={() => toggleSection("spending")} isMobile={isMobile} />
              </div>

              <CollapsibleContent isExpanded={!!expandedSections["spending"]} isMobile={isMobile}>
                {/* Hero amount */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">৳{thisMonthTotal.toLocaleString()}</span>
                  {expenseTrend !== 0 && (
                    <Badge className={`text-[9px] rounded-full px-2 h-5 font-semibold ${expenseTrend > 0
                      ? "bg-red-500/10 text-red-500 border-red-300/30 dark:border-red-500/20 hover:bg-red-500/15"
                      : "bg-green-500/10 text-green-500 border-green-300/30 dark:border-green-500/20 hover:bg-green-500/15"
                      }`}>
                      {expenseTrend > 0 ? "↑" : "↓"} {Math.abs(expenseTrend)}%
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/60 mb-4">vs ৳{lastMonthTotal.toLocaleString()} last month</p>

                {expenseChartData.length > 0 ? (
                  <div className="relative h-44 -mx-2 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                          paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                          {expenseChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid #8b5cf6", borderRadius: "0.75rem", fontSize: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                          formatter={(value: number) => [`৳${value.toLocaleString()}`, ""]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-muted-foreground/60">Total</span>
                      <span className="text-sm font-bold text-violet-600 dark:text-violet-400">৳{thisMonthTotal.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-2">
                      <BarChart3 className="w-6 h-6 text-violet-400/40" />
                    </div>
                    <p className="text-xs text-muted-foreground">No expenses this month</p>
                  </div>
                )}

                {/* Category breakdown with bars */}
                <div className="space-y-2.5">
                  {expenseChartData.slice(0, 4).map((cat, i) => {
                    const pct = thisMonthTotal > 0 ? Math.round((cat.value / thisMonthTotal) * 100) : 0;
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs font-medium">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{pct}%</span>
                            <span className="text-xs font-bold">৳{cat.value.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-violet-100/40 dark:bg-violet-900/20 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </div>
        </motion.div>

        {/* ===== ACTIVITY OVERVIEW (Moved inside grid for mobile ordering) ===== */}
        <motion.div variants={fadeUp} className="lg:col-span-12 order-2 lg:order-3">
          <div className="rounded-xl sm:rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-card/80 to-transparent backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden">
            {/* Glow orb */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/5 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 shadow-sm shadow-primary/5">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Activity Overview</h3>
                    <p className="text-[10px] text-muted-foreground">Your daily progress</p>
                  </div>
                </div>
                <ExpandButton isExpanded={!!expandedSections["activity"]} onClick={() => toggleSection("activity")} isMobile={isMobile} />
              </div>

              <CollapsibleContent isExpanded={!!expandedSections["activity"]} isMobile={isMobile}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  {[
                    {
                      label: "Tasks Done", value: completedTasks.length, total: allTasks.length,
                      color: "#3b82f6", icon: CheckCircle2,
                      gradient: "from-blue-500/15 via-blue-400/5 to-transparent",
                      border: "border-blue-200 dark:border-blue-500/20",
                      bg: "bg-blue-500/10",
                    },
                    {
                      label: "Habits Today", value: habitsCompletedToday, total: allHabits.length,
                      color: "#10b981", icon: Flame,
                      gradient: "from-emerald-500/15 via-emerald-400/5 to-transparent",
                      border: "border-emerald-200 dark:border-emerald-500/20",
                      bg: "bg-emerald-500/10",
                    },
                    {
                      label: "Study Progress", value: studyProgress, total: 100,
                      color: "#8b5cf6", icon: GraduationCap, suffix: "%",
                      gradient: "from-violet-500/15 via-violet-400/5 to-transparent",
                      border: "border-violet-200 dark:border-violet-500/20",
                      bg: "bg-violet-500/10",
                    },
                    {
                      label: "Notes Written", value: (notes || []).length, total: null,
                      color: "#f59e0b", icon: BookOpen,
                      gradient: "from-amber-500/15 via-amber-400/5 to-transparent",
                      border: "border-amber-200 dark:border-amber-500/20",
                      bg: "bg-amber-500/10",
                    },
                  ].map((item, i) => {
                    const pct = item.total ? Math.round((item.value / item.total) * 100) : 100;
                    return (
                      <motion.div key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                        className={`group relative overflow-hidden rounded-xl p-3 bg-gradient-to-br ${item.gradient} border ${item.border} backdrop-blur-sm transition-all duration-300 hover:shadow-md cursor-default flex items-center justify-between`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className={`p-1 rounded-md ${item.bg}`}>
                              <item.icon className="w-3 h-3" style={{ color: item.color }} />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground/80">{item.label}</span>
                          </div>

                          <h4 className="text-xl font-bold tracking-tight leading-none" style={{ color: item.color }}>
                            {item.value}{item.suffix || ""}
                          </h4>

                          {item.total !== null && (
                            <p className="text-[9px] text-muted-foreground/60 font-medium mt-1">
                              {item.value} / {item.total}
                            </p>
                          )}
                        </div>

                        <RadialProgress progress={pct} color={item.color} size={42} strokeWidth={4}>
                          <span className="text-[9px] font-bold" style={{ color: item.color }}>{pct}%</span>
                        </RadialProgress>

                        {/* Glow orb */}
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500"
                          style={{ backgroundColor: item.color }} />
                      </motion.div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ===== BOTTOM 3-COL GRID ===== */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6"
      >

        {/* ── Recent Tasks ── */}
        <motion.div variants={fadeUp}>
          <div className="rounded-xl sm:rounded-2xl border-2 border-blue-200 dark:border-blue-500/20 bg-gradient-to-br from-blue-50/40 via-card/80 to-sky-50/20 dark:from-blue-950/15 dark:via-card/80 dark:to-sky-950/10 backdrop-blur-sm p-4 sm:p-5 h-full relative overflow-hidden">
            {/* Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-blue-500 opacity-[0.06] blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/15 shadow-sm shadow-blue-500/10">
                    <ListTodo className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Recent Tasks</h3>
                    <p className="text-[10px] text-muted-foreground">{completedTasks.length} done · {pendingTasks.length} pending</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadialProgress progress={taskCompletionRate} color="#3b82f6" size={36} strokeWidth={3.5}>
                    <span className="text-[8px] font-bold text-blue-500">{taskCompletionRate}%</span>
                  </RadialProgress>
                  <ExpandButton isExpanded={!!expandedSections["tasks"]} onClick={() => toggleSection("tasks")} isMobile={isMobile} />
                </div>
              </div>

              <CollapsibleContent isExpanded={!!expandedSections["tasks"]} isMobile={isMobile}>
                {/* Progress bar */}
                <div className="h-1 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden mb-4 mt-3">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${taskCompletionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400" />
                </div>

                <div className="space-y-1">
                  {pendingTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </div>
                      <p className="text-sm font-medium">All clear! 🎉</p>
                    </div>
                  ) : (
                    pendingTasks.slice(0, 5).map((task, i) => (
                      <motion.div key={task.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all group cursor-default"
                      >
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ${task.priority === "urgent" ? "bg-red-500 ring-red-500/30" :
                          task.priority === "high" ? "bg-red-400 ring-red-400/20" :
                            task.priority === "medium" ? "bg-amber-400 ring-amber-400/20" :
                              "bg-blue-300 ring-blue-300/20"
                          }`} />
                        <span className="text-sm truncate flex-1 font-medium">{task.title}</span>
                        {task.due_date && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/8 text-blue-500 dark:text-blue-400 font-medium shrink-0">
                            {formatTaskDate(task.due_date)}
                          </span>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </div>
        </motion.div>

        {/* ── Habits ── */}
        <motion.div variants={fadeUp}>
          <div className="rounded-xl sm:rounded-2xl border-2 border-orange-200 dark:border-orange-500/20 bg-gradient-to-br from-orange-50/40 via-card/80 to-amber-50/20 dark:from-orange-950/15 dark:via-card/80 dark:to-amber-950/10 backdrop-blur-sm p-4 sm:p-5 h-full relative overflow-hidden">
            {/* Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-orange-500 opacity-[0.06] blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-500/15 shadow-sm shadow-orange-500/10">
                    <Flame className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Habits</h3>
                    <p className="text-[10px] text-muted-foreground">{habitsCompletedToday}/{allHabits.length} completed · 🔥 Best: {bestStreak}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadialProgress progress={habitCompletionRate} color="#f97316" size={36} strokeWidth={3.5}>
                    <span className="text-[8px] font-bold text-orange-500">{habitCompletionRate}%</span>
                  </RadialProgress>
                  <ExpandButton isExpanded={!!expandedSections["habits"]} onClick={() => toggleSection("habits")} isMobile={isMobile} />
                </div>
              </div>

              <CollapsibleContent isExpanded={!!expandedSections["habits"]} isMobile={isMobile}>
                {/* Progress bar */}
                <div className="h-1 rounded-full bg-orange-100 dark:bg-orange-900/30 overflow-hidden mb-4 mt-3">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${habitCompletionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
                </div>

                <div className="space-y-1">
                  {allHabits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-2">
                        <Flame className="w-6 h-6 text-orange-400" />
                      </div>
                      <p className="text-sm font-medium">No habits yet</p>
                    </div>
                  ) : (
                    allHabits.slice(0, 5).map((habit, i) => {
                      const done = habit.last_completed_date?.split("T")[0] === todayStr;
                      return (
                        <motion.div key={habit.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-all cursor-default"
                        >
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${done
                            ? "bg-gradient-to-br from-green-400 to-emerald-500 shadow-md shadow-green-500/25"
                            : "bg-muted/30 border-2 border-muted-foreground/15"
                            }`}>
                            {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm truncate flex-1 font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
                            {habit.habit_name}
                          </span>
                          {habit.streak_count > 0 && (
                            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-300/30 dark:border-orange-500/20">
                              <Flame className="w-3 h-3 text-orange-500 fill-current" />
                              <span className="text-[10px] font-bold text-orange-500">{habit.streak_count}</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </div>
        </motion.div>

        {/* ── Study + Transactions ── */}
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Study Progress */}
          <div className="rounded-xl sm:rounded-2xl border-2 border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-violet-50/30 via-card/80 to-purple-50/20 dark:from-violet-950/15 dark:via-card/80 dark:to-purple-950/10 backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-violet-500 opacity-[0.05] blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-500/15 shadow-sm shadow-violet-500/10">
                    <GraduationCap className="w-4 h-4 text-violet-500" />
                  </div>
                  <h3 className="font-semibold text-sm">Study</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-violet-500">{studyProgress}%</span>
                  <Badge className="text-[9px] rounded-full bg-violet-500/10 text-violet-500 border-violet-300/30 dark:border-violet-500/20 hover:bg-violet-500/15">
                    {completedChapters}/{allChapters.length}
                  </Badge>
                  <ExpandButton isExpanded={!!expandedSections["study"]} onClick={() => toggleSection("study")} isMobile={isMobile} />
                </div>
              </div>

              <CollapsibleContent isExpanded={!!expandedSections["study"]} isMobile={isMobile}>
                {subjectProgressList.length > 0 ? (
                  <div className="space-y-3">
                    {subjectProgressList.slice(0, 3).map((sp, i) => (
                      <div key={sp.subject}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold">{sp.subject}</span>
                          <span className="font-bold text-violet-500">{sp.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-violet-100/50 dark:bg-violet-900/20 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${sp.progress}%` }}
                            transition={{ duration: 1, delay: 0.3 + i * 0.15 }}
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 shadow-sm shadow-violet-500/20"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No study data</p>
                )}
              </CollapsibleContent>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="rounded-xl sm:rounded-2xl border-2 border-cyan-200 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-50/30 via-card/80 to-teal-50/20 dark:from-cyan-950/15 dark:via-card/80 dark:to-teal-950/10 backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-cyan-500 opacity-[0.05] blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/15 shadow-sm shadow-cyan-500/10">
                    <Clock className="w-4 h-4 text-cyan-500" />
                  </div>
                  <h3 className="font-semibold text-sm">Transactions</h3>
                </div>
                <ExpandButton isExpanded={!!expandedSections["transactions"]} onClick={() => toggleSection("transactions")} isMobile={isMobile} />
              </div>

              <CollapsibleContent isExpanded={!!expandedSections["transactions"]} isMobile={isMobile}>
                <div className="space-y-1.5">
                  {recentTransactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No transactions</p>
                  ) : (
                    recentTransactions.slice(0, 4).map((tx, i) => (
                      <motion.div key={tx.id}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 * i }}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-cyan-500/5 dark:hover:bg-cyan-500/8 transition-all"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${tx.type === "income"
                          ? "bg-gradient-to-br from-green-400/20 to-emerald-500/10 shadow-green-500/10"
                          : "bg-gradient-to-br from-red-400/20 to-rose-500/10 shadow-red-500/10"
                          }`}>
                          {tx.type === "income" ? (
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate font-semibold">{tx.description || tx.category}</p>
                          {tx.category && tx.description && (
                            <p className="text-[9px] text-muted-foreground/60">{tx.category}</p>
                          )}
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${tx.type === "income" ? "text-green-500" : "text-red-500"
                          }`}>
                          {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString()}
                        </span>
                      </motion.div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
};

export default Index;

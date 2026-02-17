import { useEffect, useMemo, useState } from "react";
import { SEO } from "@/components/seo/SEO";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ListTodo, Target, TrendingUp, CalendarDays, PiggyBank,
  BookOpen, Flame, BarChart3, Activity, ArrowUpRight, ArrowDownRight,
  GraduationCap, CheckCircle2, Clock, Zap, Brain, Sparkles, Loader2, AlertCircle, Lightbulb
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

// Mini circular progress
function MiniRing({ progress, size = 44, color = "#00D4AA" }: { progress: number; size?: number; color?: string }) {
  const sw = 4;
  const r = (size - sw) / 2;
  const c = r * 2 * Math.PI;
  const o = c - (Math.min(100, progress) / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-secondary/40" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={o} style={{ transition: "stroke-dashoffset 1s ease" }}
      />
    </svg>
  );
}

const Index = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { balance, totalIncome, totalExpenses, expensesByCategory, expenses, regularEntries } = useFinance();
  const { totalSavings, budgetRemaining, primaryBudget, savingsGoals } = useBudget();
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { chapters, subjectProgress } = useStudy();
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
  const highPriorityTasks = pendingTasks.filter(t => t.priority === "high");
  const taskCompletionRate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

  // ===== HABIT ANALYTICS =====
  const allHabits = habits || [];
  const habitsCompletedToday = allHabits.filter(h => {
    if (!h.last_completed_date) return false;
    return h.last_completed_date.split("T")[0] === todayStr;
  }).length;
  const habitCompletionRate = allHabits.length > 0 ? Math.round((habitsCompletedToday / allHabits.length) * 100) : 0;
  const bestStreak = allHabits.length > 0 ? Math.max(...allHabits.map(h => h.streak_count), 0) : 0;
  const totalStreakDays = allHabits.reduce((sum, h) => sum + h.streak_count, 0);

  // ===== STUDY ANALYTICS =====
  const allChapters = chapters || [];
  const completedChapters = allChapters.filter(c => c.status === "completed").length;
  const studyProgress = allChapters.length > 0 ? Math.round(allChapters.reduce((s, c) => s + c.progress_percentage, 0) / allChapters.length) : 0;

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

  const formatBalance = (amount: number) => `${amount >= 0 ? "" : "-"}৳${Math.abs(amount).toLocaleString()}`;

  // Recent transactions
  const recentTransactions = (regularEntries || []).slice(0, 5);

  // ===== AI SUMMARY =====
  const [aiSummary, setAiSummary] = useState<{ summary: string; alerts: string[]; tips: string[] } | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Load cached summary from localStorage
  useEffect(() => {
    const cached = localStorage.getItem("lifeos-daily-summary");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Only use cache if from today
        if (parsed.date === todayStr) {
          setAiSummary(parsed.data);
        }
      } catch { }
    }
  }, []);

  const generateAISummary = async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    try {
      const contextPrompt = `You are an intelligent daily briefing AI for a personal life management app called LifeOS. Analyze ALL of the user's data below and generate a concise, actionable daily summary.

Today's Date: ${today}
Time: ${new Date().toLocaleTimeString()}

=== TASKS (${allTasks.length} total, ${completedTasks.length} completed, ${pendingTasks.length} pending) ===
High Priority: ${highPriorityTasks.map(t => t.title).join(', ') || 'None'}
Pending Tasks: ${pendingTasks.slice(0, 8).map(t => `"${t.title}" [${t.priority}] due:${t.due_date || 'none'}`).join('; ') || 'None'}
Completed Today: ${completedTasks.filter(t => t.due_date?.startsWith(todayStr)).map(t => t.title).join(', ') || 'None'}

=== HABITS (${allHabits.length} total, ${habitsCompletedToday}/${allHabits.length} done today) ===
${allHabits.map(h => `${h.habit_name}: streak=${h.streak_count}, done_today=${h.last_completed_date?.startsWith(todayStr) ? 'yes' : 'no'}`).join('\n') || 'No habits'}

=== FINANCE ===
Balance: ৳${balance}
This Month Spending: ৳${thisMonthTotal}
Budget Remaining: ৳${budgetRemaining}
Total Savings: ৳${totalSavings}
Top Expense Categories: ${expenseChartData.slice(0, 3).map(c => `${c.name}=৳${c.value}`).join(', ') || 'None'}

=== STUDY (${studyProgress}% overall) ===
${(subjectProgress || []).slice(0, 5).map(s => `${s.subject}: ${s.progress}%`).join(', ') || 'No study data'}

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
      // Cache for today
      localStorage.setItem("lifeos-daily-summary", JSON.stringify({ date: todayStr, data: summaryData }));
    } catch (err) {
      console.error("AI Summary error:", err);
      setSummaryError("Failed to generate summary. Check your API key.");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  return (
    <AppLayout>
      <SEO title="Dashboard" description="Overview of your tasks, finance, habits, and study progress." />

      {/* ===== HEADER ===== */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <CalendarDays className="w-4 h-4" />
          <span>{today}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          {greeting}, <span className="text-gradient">{user?.name?.split(" ")[0] || "User"}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's your daily snapshot</p>
      </motion.div>

      {/* ===== PRIMARY STATS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Wallet, label: "Balance", value: formatBalance(balance), sub: `Income: ৳${totalIncome.toLocaleString()}`, color: "text-primary", bg: "from-primary/15 to-primary/5", trend: balance >= 0 ? { value: Math.round((balance / (totalIncome || 1)) * 100), up: true } : null },
          { icon: Target, label: "Budget Left", value: `৳${budgetRemaining.toLocaleString()}`, sub: primaryBudget?.name || "No budget set", color: "text-amber-400", bg: "from-amber-500/15 to-amber-500/5", trend: budgetRemaining >= 0 ? { value: Math.round((budgetRemaining / (primaryBudget?.target_amount || 1)) * 100), up: true } : null },
          { icon: PiggyBank, label: "Total Savings", value: `৳${totalSavings.toLocaleString()}`, sub: `${savingsGoals.length} goal(s)`, color: "text-green-400", bg: "from-green-500/15 to-green-500/5", trend: null },
          { icon: ListTodo, label: "Pending Tasks", value: String(pendingTasks.length), sub: `${highPriorityTasks.length} high priority`, color: "text-rose-400", bg: "from-rose-500/15 to-rose-500/5", trend: null },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`glass-card p-4 bg-gradient-to-br ${stat.bg} border border-white/5`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-xl bg-background/50 ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
              {stat.trend && (
                <Badge variant="outline" className={`text-[10px] h-5 ${stat.trend.up ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}`}>
                  {stat.trend.up ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                  {stat.trend.value}%
                </Badge>
              )}
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">

        {/* === LEFT: AI Summary === */}
        <div className="lg:col-span-2 space-y-4">

          {/* AI Daily Summary */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-5 border border-white/5 relative overflow-hidden"
          >
            {/* Subtle gradient background */}
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-[60px] opacity-30" style={{ background: "linear-gradient(135deg, #38bdf8, #6366f1)" }} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-sky-400/20 to-indigo-500/20">
                    <Brain className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Orbit AI Summary</h3>
                    <p className="text-[10px] text-muted-foreground">Your intelligent daily briefing</p>
                  </div>
                </div>
                <button
                  onClick={generateAISummary}
                  disabled={isSummaryLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60 shadow-lg shadow-sky-500/20"
                >
                  {isSummaryLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> {aiSummary ? 'Refresh' : 'Generate Summary'}</>
                  )}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {summaryError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    {summaryError}
                  </motion.div>
                )}

                {aiSummary ? (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Summary text */}
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary.summary}</p>

                    <div className="grid md:grid-cols-2 gap-3">
                      {/* Alerts */}
                      {aiSummary.alerts.length > 0 && (
                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-400">Attention</span>
                          </div>
                          <ul className="space-y-1">
                            {aiSummary.alerts.map((alert, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                {alert}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Tips */}
                      {aiSummary.tips.length > 0 && (
                        <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/15">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Lightbulb className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-xs font-semibold text-sky-400">Suggestions</span>
                          </div>
                          <ul className="space-y-1">
                            {aiSummary.tips.map((tip, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : !isSummaryLoading && !summaryError && (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-6 text-center"
                  >
                    <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Click "Generate Summary" to get your AI-powered daily briefing</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Orbit will analyze your tasks, habits, finances, and more</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="space-y-4">
          {/* Monthly Spending */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="glass-card p-5 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Monthly Spending</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-gradient">৳{thisMonthTotal.toLocaleString()}</span>
                {expenseTrend !== 0 && (
                  <Badge variant="outline" className={`text-[9px] h-4 ${expenseTrend > 0 ? "text-red-400 border-red-500/30" : "text-green-400 border-green-500/30"}`}>
                    {expenseTrend > 0 ? "+" : ""}{expenseTrend}%
                  </Badge>
                )}
              </div>
            </div>
            {expenseChartData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                      {expenseChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem" }}
                      formatter={(value: number) => [`৳${value.toLocaleString()}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No expense data this month</p>
            )}
            {/* Category breakdown */}
            <div className="space-y-1.5 mt-2">
              {expenseChartData.slice(0, 4).map(cat => (
                <div key={cat.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-muted-foreground">{cat.name}</span>
                  <span className="font-medium">৳{cat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Study Progress */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="glass-card p-5 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-violet-400" />
                <h3 className="font-semibold text-sm">Study Progress</h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">{completedChapters}/{allChapters.length} done</Badge>
            </div>
            {(subjectProgress || []).length > 0 ? (
              <div className="space-y-3">
                {subjectProgress.slice(0, 4).map((sp, i) => (
                  <div key={sp.subject}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{sp.subject}</span>
                      <span className="text-muted-foreground">{sp.progress}%</span>
                    </div>
                    <Progress value={sp.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No study data yet</p>
            )}
          </motion.div>

          {/* Recent Transactions */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="glass-card p-5 border border-white/5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm">Recent Transactions</h3>
            </div>
            <div className="space-y-2">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {tx.type === "income" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs">{tx.description || tx.category}</p>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                      {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== BOTTOM ROW: Activity Overview + Tasks + Habits ===== */}
      <div className="space-y-4 mb-6">

        {/* Activity Overview - Full Width */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="glass-card p-5 border border-white/5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Activity Overview</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Tasks Done", value: completedTasks.length, total: allTasks.length, color: "#3b82f6", icon: CheckCircle2 },
              { label: "Habits Today", value: habitsCompletedToday, total: allHabits.length, color: "#10b981", icon: Flame },
              { label: "Study Progress", value: studyProgress, total: 100, color: "#8b5cf6", icon: GraduationCap, suffix: "%" },
              { label: "Notes Written", value: (notes || []).length, total: null, color: "#f59e0b", icon: BookOpen },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="relative">
                  <MiniRing progress={item.total ? (item.value / item.total) * 100 : 100} color={item.color} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-bold">{item.value}{item.suffix || ""}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tasks + Habits Row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent Tasks */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
            className="glass-card p-5 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm">Recent Tasks</h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">{pendingTasks.length} pending</Badge>
            </div>
            <div className="space-y-2">
              {pendingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All clear! 🎉</p>
              ) : (
                pendingTasks.slice(0, 5).map((task, i) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === "high" ? "bg-red-400" : task.priority === "medium" ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                    <span className="text-sm truncate flex-1">{task.title}</span>
                    {task.due_date && <span className="text-[10px] text-muted-foreground shrink-0">{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Habits Summary */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="glass-card p-5 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="font-semibold text-sm">Habits</h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">{habitCompletionRate}% today</Badge>
            </div>
            <div className="space-y-2">
              {allHabits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No habits yet</p>
              ) : (
                allHabits.slice(0, 5).map((habit) => {
                  const done = habit.last_completed_date?.split("T")[0] === todayStr;
                  return (
                    <div key={habit.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${done ? "bg-green-500 text-white" : "bg-secondary"}`}>
                        {done && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <span className={`text-sm truncate flex-1 ${done ? "text-muted-foreground line-through" : ""}`}>{habit.habit_name}</span>
                      {habit.streak_count > 0 && (
                        <div className="flex items-center gap-0.5 text-orange-400">
                          <Flame className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-medium">{habit.streak_count}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;

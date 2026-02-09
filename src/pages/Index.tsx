import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  ListTodo,
  Target,
  TrendingUp,
  CalendarDays,
  PiggyBank
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskList } from "@/components/dashboard/TaskList";
import { HabitTracker } from "@/components/dashboard/HabitTracker";
import { ExpenseChart } from "@/components/dashboard/ExpenseChart";
import { AIBriefing } from "@/components/dashboard/AIBriefing";
import { useTheme } from "@/hooks/useTheme";
import { useFinance } from "@/hooks/useFinance";
import { useBudget } from "@/hooks/useBudget";
import { useTasks } from "@/hooks/useTasks";
import { useHabits } from "@/hooks/useHabits";
import { useAuth } from "@/contexts/AuthContext";

// Mock data for insights - will be replaced with AI-generated
const mockInsights = {
  summary: "You've completed 60% of today's tasks. Your spending is 15% under budget this month. Keep up the great work with your exercise habit - 15 days strong! 💪",
  tips: [
    "Consider batching similar tasks to improve focus",
    "Your food expenses are trending up - maybe try meal prep?",
  ],
  alerts: [
    "2 high-priority tasks due today",
    "Meditation streak at risk - don't forget!",
  ],
};

// Color mapping for expense categories
const categoryColors: Record<string, string> = {
  "Food": "hsl(187, 85%, 53%)",
  "Transport": "hsl(152, 69%, 50%)",
  "Entertainment": "hsl(38, 92%, 55%)",
  "Bills": "hsl(280, 65%, 60%)",
  "Shopping": "hsl(340, 75%, 55%)",
  "Health": "hsl(120, 60%, 50%)",
  "Education": "hsl(200, 70%, 55%)",
  "Other": "hsl(0, 0%, 60%)",
};

const Index = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { balance, totalIncome, totalExpenses, expensesByCategory, expenses } = useFinance();
  const { totalSavings, budgetRemaining, primaryBudget, savingsGoals } = useBudget();
  const { tasks } = useTasks();
  const { habits } = useHabits();

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.classList.add(theme);
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Calculate real stats
  const todaysTasks = tasks?.filter(t => t.status !== "done") || [];
  const inProgressTasks = tasks?.filter(t => t.status === "in-progress") || [];
  const activeHabits = habits?.length || 0;
  const completedHabitsToday = habits?.filter(h => h.streak_count > 0)?.length || 0;

  // Prepare expense chart data from real data
  const expenseChartData = Object.entries(expensesByCategory || {}).map(([name, value]) => ({
    name,
    value,
    color: categoryColors[name] || categoryColors["Other"],
  }));

  // Mock tasks for display (keep until TaskList is connected)
  const displayTasks = tasks?.slice(0, 4).map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as "todo" | "in-progress" | "done",
    priority: t.priority as "low" | "medium" | "high",
    dueDate: t.due_date ? new Date(t.due_date).toLocaleString() : undefined,
  })) || [];

  // Mock habits for display
  const displayHabits = habits?.slice(0, 4).map(h => ({
    id: h.id,
    name: h.habit_name,
    streak: h.streak_count,
    completedToday: h.streak_count > 0,
  })) || [];

  // Format balance for display
  const formatBalance = (amount: number) => {
    const sign = amount >= 0 ? "" : "-";
    return `${sign}৳${Math.abs(amount).toLocaleString()}`;
  };

  return (
    <AppLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <CalendarDays className="w-4 h-4" />
          <span>{today}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Good afternoon, <span className="text-gradient">{user?.name?.split(" ")[0] || "User"}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's your daily snapshot
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="All-Time Balance"
          value={formatBalance(balance)}
          subtitle={`Income: ৳${totalIncome.toLocaleString()}`}
          icon={Wallet}
          trend={balance >= 0 ? { value: Math.round((balance / (totalIncome || 1)) * 100), isPositive: true } : undefined}
          color="primary"
          delay={0}
        />
        <StatCard
          title="Budget Left"
          value={`৳${budgetRemaining.toLocaleString()}`}
          subtitle={primaryBudget ? primaryBudget.name : "No budget set"}
          icon={Target}
          trend={budgetRemaining >= 0 ? { value: Math.round((budgetRemaining / (primaryBudget?.target_amount || 1)) * 100), isPositive: true } : undefined}
          color="warning"
          delay={0.1}
        />
        <StatCard
          title="Total Savings"
          value={`৳${totalSavings.toLocaleString()}`}
          subtitle={`${savingsGoals.length} saving goal(s)`}
          icon={PiggyBank}
          color="success"
          delay={0.2}
        />
        <StatCard
          title="Tasks Today"
          value={String(todaysTasks.length)}
          subtitle={`${inProgressTasks.length} in progress`}
          icon={ListTodo}
          color="primary"
          delay={0.3}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks & Habits */}
        <div className="lg:col-span-2 space-y-6">
          <TaskList tasks={displayTasks.length > 0 ? displayTasks : []} />
          <div className="grid md:grid-cols-2 gap-6">
            <HabitTracker habits={displayHabits.length > 0 ? displayHabits : []} />
            <ExpenseChart
              data={expenseChartData.length > 0 ? expenseChartData : []}
              total={totalExpenses}
            />
          </div>
        </div>

        {/* Right Column - AI Briefing */}
        <div className="space-y-6">
          <AIBriefing insights={mockInsights} />

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-5"
          >
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Add Expense", emoji: "💸" },
                { label: "New Task", emoji: "✅" },
                { label: "Add Note", emoji: "📝" },
                { label: "Track Habit", emoji: "🎯" },
              ].map((action) => (
                <button
                  key={action.label}
                  className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left"
                >
                  <span className="text-lg">{action.emoji}</span>
                  <p className="text-sm font-medium mt-1">{action.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;

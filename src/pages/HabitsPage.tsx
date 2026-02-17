import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Flame, Check, Trash2, Target, TrendingUp, Award, Zap, Calendar, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo/SEO";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useHabits, Habit } from "@/hooks/useHabits";
import { cn } from "@/lib/utils";

// Circular Progress for completion ring
function CompletionRing({ completed, total, size = 100 }: { completed: number; total: number; size?: number }) {
    const progress = total > 0 ? (completed / total) * 100 : 0;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-secondary/50" />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#completionGradient)" strokeWidth={strokeWidth} strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeDasharray={circumference}
                />
                <defs>
                    <linearGradient id="completionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06d6a0" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{completed}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">of {total}</span>
            </div>
        </div>
    );
}

// Streak flame with intensity
function StreakFlame({ streak }: { streak: number }) {
    const intensity = streak >= 30 ? "text-red-500" : streak >= 14 ? "text-orange-500" : streak >= 7 ? "text-amber-500" : streak > 0 ? "text-yellow-500" : "text-muted-foreground/30";
    const fillIntensity = streak >= 7 ? `fill-current ${intensity}` : "";
    return <Flame className={cn("w-5 h-5 transition-all", intensity, fillIntensity)} />;
}

export default function HabitsPage() {
    const { habits, isLoading, addHabit, completeHabit, deleteHabit } = useHabits();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newHabitName, setNewHabitName] = useState("");

    const handleAddHabit = async () => {
        if (!newHabitName.trim()) return;
        await addHabit.mutateAsync(newHabitName);
        setNewHabitName("");
        setIsDialogOpen(false);
    };

    const isCompletedToday = (habit: Habit) => {
        if (!habit.last_completed_date) return false;
        const today = new Date().toISOString().split("T")[0];
        const lastCompleted = habit.last_completed_date.split("T")[0];
        return lastCompleted === today;
    };

    const isCompletedOnDate = (habit: Habit, date: Date) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date); checkDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
        const lastCompleted = habit.last_completed_date ? new Date(habit.last_completed_date) : null;
        if (lastCompleted) lastCompleted.setHours(0, 0, 0, 0);
        if (lastCompleted && lastCompleted.getTime() === today.getTime()) {
            return diffDays < habit.streak_count;
        } else if (lastCompleted) {
            const daysSinceLast = Math.round((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceLast === 1) return (diffDays > 0) && (diffDays <= habit.streak_count);
        }
        return false;
    };

    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
        return days;
    };
    const last7Days = getLast7Days();

    const totalCompleted = habits.filter(isCompletedToday).length;
    const completionRate = habits.length > 0 ? Math.round((totalCompleted / habits.length) * 100) : 0;
    const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak_count)) : 0;
    const totalStreaks = habits.reduce((sum, h) => sum + h.streak_count, 0);

    // Sort: uncompleted first, then by streak desc
    const sortedHabits = useMemo(() => {
        return [...habits].sort((a, b) => {
            const aToday = isCompletedToday(a);
            const bToday = isCompletedToday(b);
            if (aToday !== bToday) return aToday ? 1 : -1;
            return b.streak_count - a.streak_count;
        });
    }, [habits]);

    return (
        <AppLayout>
            <SEO title="Habit Tracker" description="Build lasting habits with streak tracking and visual progress." />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">

                {/* ===== HEADER ===== */}
                <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
                    <div className="hidden md:block">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
                                <Target className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h1 className="text-3xl font-bold">Habit Tracker</h1>
                        </div>
                        <p className="text-muted-foreground text-sm ml-14">Build consistency, one day at a time</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> New Habit</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Create New Habit</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Input placeholder="Habit name (e.g., Exercise, Read, Meditate)" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddHabit()} />
                                <Button onClick={handleAddHabit} className="w-full" disabled={addHabit.isPending}>
                                    {addHabit.isPending ? "Creating..." : "Create Habit"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* ===== STATS + COMPLETION RING ===== */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
                    {/* Completion Ring */}
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="col-span-2 md:col-span-1 glass-card p-3 sm:p-4 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10"
                    >
                        <CompletionRing completed={totalCompleted} total={habits.length} size={90} />
                        <p className="text-xs text-muted-foreground mt-2">Today's Progress</p>
                    </motion.div>

                    {/* Stat cards */}
                    {[
                        { icon: Zap, label: "Active Habits", value: habits.length, color: "text-blue-400", bg: "from-blue-500/15 to-blue-500/5" },
                        { icon: Check, label: "Done Today", value: totalCompleted, color: "text-green-400", bg: "from-green-500/15 to-green-500/5" },
                        { icon: Flame, label: "Best Streak", value: `${bestStreak}d`, color: "text-orange-400", bg: "from-orange-500/15 to-orange-500/5" },
                        { icon: TrendingUp, label: "Completion", value: `${completionRate}%`, color: "text-violet-400", bg: "from-violet-500/15 to-violet-500/5" },
                    ].map((stat, i) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className={`glass-card p-3 sm:p-4 bg-gradient-to-br ${stat.bg} border border-white/5`}
                        >
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`p-1.5 sm:p-2 rounded-lg bg-background/50 ${stat.color}`}><stat.icon className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                <div>
                                    <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ===== HABIT LIST ===== */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-pulse flex flex-col items-center gap-3">
                                <Target className="w-10 h-10 opacity-50" />
                                <span className="text-muted-foreground">Loading habits...</span>
                            </div>
                        </div>
                    ) : habits.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Target className="w-12 h-12 text-emerald-400 opacity-60" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Start Building Habits</h3>
                                    <p className="text-muted-foreground text-sm">Create your first habit to begin your streak!</p>
                                </div>
                                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2"><Plus className="w-4 h-4" /> Create First Habit</Button>
                            </div>
                        </motion.div>
                    ) : (
                        sortedHabits.map((habit, index) => {
                            const completed = isCompletedToday(habit);
                            return (
                                <motion.div
                                    key={habit.id}
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={cn(
                                        "glass-card p-3 sm:p-5 transition-all group",
                                        completed ? "border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent" : "hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Completion Button */}
                                            <button
                                                onClick={() => !completed && completeHabit.mutate(habit)}
                                                disabled={completed}
                                                className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0",
                                                    completed
                                                        ? "bg-green-500 text-white shadow-green-500/30 scale-105"
                                                        : "bg-secondary hover:bg-primary/10 hover:ring-2 hover:ring-primary/20 text-muted-foreground hover:text-primary"
                                                )}
                                            >
                                                <Check className={cn("w-6 h-6", completed ? "stroke-[3px]" : "")} />
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <h3 className={cn("font-semibold text-lg", completed && "text-green-400")}>{habit.habit_name}</h3>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <StreakFlame streak={habit.streak_count} />
                                                        <span className={cn(habit.streak_count > 0 && "text-orange-400 font-medium")}>
                                                            {habit.streak_count} day{habit.streak_count !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>
                                                    {completed && (
                                                        <Badge variant="outline" className="text-[10px] h-5 border-green-500/30 text-green-400">
                                                            <Sparkles className="w-3 h-3 mr-1" /> Done today
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Weekly Visual */}
                                        <div className="flex items-center gap-2 self-end md:self-auto overflow-x-auto scrollbar-none">
                                            <div className="flex gap-1 sm:gap-1.5">
                                                {last7Days.map((date, i) => {
                                                    const isDone = isCompletedOnDate(habit, date);
                                                    const isToday = date.toDateString() === new Date().toDateString();
                                                    return (
                                                        <div key={i} className="flex flex-col items-center gap-1">
                                                            <div className={cn(
                                                                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] font-medium border transition-all",
                                                                isDone ? "bg-green-500/80 border-green-500 text-white shadow-sm shadow-green-500/20" :
                                                                    isToday ? "border-primary/50 bg-primary/10 text-foreground" :
                                                                        "border-border bg-secondary/30 text-muted-foreground"
                                                            )} title={date.toDateString()}>
                                                                {date.getDate()}
                                                            </div>
                                                            <span className="text-[9px] text-muted-foreground uppercase">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => deleteHabit.mutate(habit.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </AppLayout>
    );
}

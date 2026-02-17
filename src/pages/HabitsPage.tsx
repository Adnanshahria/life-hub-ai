import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Flame, Check, Trash2, Target, TrendingUp, Zap,
    Lightbulb, Search, Brain, Sparkles, Edit2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useHabits, Habit, HABIT_CATEGORIES, HabitCategory } from "@/hooks/useHabits";
import { getHabitTips, getHabitCoaching } from "@/lib/groq";

import { useAI } from "@/contexts/AIContext";
import { cn } from "@/lib/utils";

// Streak flame with intensity
function StreakFlame({ streak, size = "md" }: { streak: number; size?: "sm" | "md" }) {
    const intensity = streak >= 30 ? "text-red-500" : streak >= 14 ? "text-orange-500" : streak >= 7 ? "text-amber-500" : streak > 0 ? "text-yellow-500" : "text-muted-foreground/30";
    const fillIntensity = streak >= 7 ? `fill-current ${intensity}` : "";
    const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
    return <Flame className={cn(sizeClass, "transition-all", intensity, fillIntensity)} />;
}

export default function HabitsPage() {
    const { habits, isLoading, addHabit, updateHabit, completeHabit, deleteHabit } = useHabits();
    const { setPageContext } = useAI();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [newHabit, setNewHabit] = useState({ name: "", category: "general" as HabitCategory });
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("all");

    // AI state
    const [aiTips, setAiTips] = useState<string | null>(null);
    const [aiTipsFor, setAiTipsFor] = useState<string>("");
    const [loadingTips, setLoadingTips] = useState(false);
    const [coaching, setCoaching] = useState<string | null>(null);
    const [loadingCoaching, setLoadingCoaching] = useState(false);

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

    // Stats
    const totalCompleted = habits.filter(isCompletedToday).length;
    const completionRate = habits.length > 0 ? Math.round((totalCompleted / habits.length) * 100) : 0;
    const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak_count), 0) : 0;

    // Set AI Page Context
    useEffect(() => {
        setPageContext(`User is on Habits Page. 
        Active Habits: ${habits.length}, Done Today: ${totalCompleted}/${habits.length}.
        Best Streak: ${bestStreak} days. Completion Rate: ${completionRate}%.
        Habits: ${habits.map(h => `${h.habit_name} (${h.streak_count}d streak)`).join(", ") || "None yet"}.`);
    }, [habits, totalCompleted, bestStreak, completionRate, setPageContext]);

    // Filtering
    const filteredHabits = useMemo(() => {
        let result = [...habits];
        if (activeCategory !== "all") result = result.filter(h => h.category === activeCategory);
        if (searchTerm) result = result.filter(h => h.habit_name.toLowerCase().includes(searchTerm.toLowerCase()));
        // Sort: uncompleted first, then by streak desc
        return result.sort((a, b) => {
            const aToday = isCompletedToday(a);
            const bToday = isCompletedToday(b);
            if (aToday !== bToday) return aToday ? 1 : -1;
            return b.streak_count - a.streak_count;
        });
    }, [habits, activeCategory, searchTerm]);

    // Weekly heatmap: aggregate completion per day
    const weeklyHeatmap = useMemo(() => {
        return last7Days.map(date => {
            const completed = habits.filter(h => isCompletedOnDate(h, date)).length;
            const isToday = date.toDateString() === new Date().toDateString();
            return { date, completed, total: habits.length, isToday };
        });
    }, [habits, last7Days]);

    const handleAddHabit = async () => {
        if (!newHabit.name.trim()) return;
        await addHabit.mutateAsync({ name: newHabit.name, category: newHabit.category });
        setNewHabit({ name: "", category: "general" });
        setIsDialogOpen(false);
    };

    const handleEditHabit = async () => {
        if (!editingHabit) return;
        await updateHabit.mutateAsync({
            id: editingHabit.id,
            name: editingHabit.habit_name,
            category: editingHabit.category,
        });
        setEditingHabit(null);
    };

    const handleGetTips = async (habit: Habit) => {
        setLoadingTips(true);
        setAiTipsFor(habit.habit_name);
        try {
            const tips = await getHabitTips(habit.habit_name, habit.streak_count);
            setAiTips(tips);
        } catch {
            setAiTips("Failed to get tips. Please try again.");
        }
        setLoadingTips(false);
    };

    const handleGetCoaching = async () => {
        setLoadingCoaching(true);
        try {
            const habitData = habits.map(h => ({
                name: h.habit_name,
                streak: h.streak_count,
                completedToday: isCompletedToday(h),
            }));
            const result = await getHabitCoaching(habitData);
            setCoaching(result);
        } catch {
            setCoaching("Failed to get coaching. Please try again.");
        }
        setLoadingCoaching(false);
    };

    const getCategoryEmoji = (cat: string) => HABIT_CATEGORIES.find(c => c.value === cat)?.emoji || "📌";

    return (
        <AppLayout>
            <SEO title="Habit Tracker" description="Build lasting habits with streak tracking, AI coaching, and visual progress." />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">

                {/* ===== SINGLE-ROW CONTROLS ===== */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <h1 className="text-3xl font-bold">Habits</h1>
                    </div>

                    <div className="top-toolbar">
                        {/* Category Filter */}
                        <Select value={activeCategory} onValueChange={setActiveCategory}>
                            <SelectTrigger className="w-auto min-w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {HABIT_CATEGORIES.map(c => (
                                    <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[100px] max-w-[200px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-xs sm:text-sm"
                            />
                        </div>

                        {/* AI Coach Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs sm:text-sm"
                            onClick={handleGetCoaching}
                            disabled={loadingCoaching || habits.length === 0}
                        >
                            <Brain className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{loadingCoaching ? "Thinking..." : "AI Coach"}</span>
                        </Button>

                        {/* Add Habit */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" className="h-8 w-8 sm:w-auto sm:px-3 sm:gap-1.5 shadow-lg shadow-primary/20">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Habit</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                                <DialogHeader><DialogTitle>Create New Habit</DialogTitle></DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <Input
                                        placeholder="Habit name (e.g., Exercise, Read, Meditate)"
                                        value={newHabit.name}
                                        onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                                        onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
                                    />
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
                                        <div className="flex flex-wrap gap-2">
                                            {HABIT_CATEGORIES.map(c => (
                                                <button
                                                    key={c.value}
                                                    onClick={() => setNewHabit({ ...newHabit, category: c.value })}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                                        newHabit.category === c.value
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-secondary/50 border-border hover:border-primary/30"
                                                    )}
                                                >
                                                    {c.emoji} {c.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <Button onClick={handleAddHabit} className="w-full" disabled={addHabit.isPending}>
                                        {addHabit.isPending ? "Creating..." : "Create Habit"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* ===== STATS GRID ===== */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                    {[
                        { icon: Zap, label: "Active", value: habits.length, color: "text-blue-400", bg: "from-blue-500/15 to-blue-500/5" },
                        { icon: Check, label: "Today", value: totalCompleted, color: "text-green-400", bg: "from-green-500/15 to-green-500/5" },
                        { icon: Flame, label: "Best", value: `${bestStreak}d`, color: "text-orange-400", bg: "from-orange-500/15 to-orange-500/5" },
                        { icon: TrendingUp, label: "Rate", value: `${completionRate}%`, color: "text-violet-400", bg: "from-violet-500/15 to-violet-500/5" },
                    ].map((stat) => (
                        <div key={stat.label} className={`glass-card p-2 sm:p-3 bg-gradient-to-br ${stat.bg} border border-white/5`}>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`p-1.5 sm:p-2 rounded-lg bg-background/50 ${stat.color}`}>
                                    <stat.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm sm:text-lg font-bold">{stat.value}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ===== WEEKLY HEATMAP ===== */}
                <div className="glass-card p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">This Week</p>
                        <p className="text-xs text-muted-foreground">{totalCompleted}/{habits.length} today</p>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {weeklyHeatmap.map((day, i) => {
                            const pct = day.total > 0 ? (day.completed / day.total) * 100 : 0;
                            return (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div className={cn(
                                        "w-full aspect-square rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold border transition-all",
                                        pct >= 100 ? "bg-green-500/80 border-green-500 text-white shadow-sm shadow-green-500/20" :
                                            pct >= 50 ? "bg-green-500/30 border-green-500/40 text-green-400" :
                                                pct > 0 ? "bg-amber-500/20 border-amber-500/30 text-amber-400" :
                                                    day.isToday ? "border-primary/50 bg-primary/10 text-foreground" :
                                                        "border-border bg-secondary/30 text-muted-foreground"
                                    )}>
                                        {day.date.getDate()}
                                    </div>
                                    <span className="text-[9px] text-muted-foreground uppercase">
                                        {day.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ===== AI COACHING ===== */}
                <AnimatePresence>
                    {coaching && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="glass-card p-4 border border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-transparent"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-violet-500/10"><Brain className="w-5 h-5 text-violet-400" /></div>
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-1 text-violet-300">AI Coach</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{coaching}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setCoaching(null)} className="text-muted-foreground hover:text-foreground">×</Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ===== AI TIPS (per-habit) ===== */}
                <AnimatePresence>
                    {aiTips && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="glass-card p-4 border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-transparent"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-yellow-500/10"><Lightbulb className="w-5 h-5 text-yellow-400" /></div>
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-1 text-yellow-300">Tips — {aiTipsFor}</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiTips}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setAiTips(null)} className="text-muted-foreground hover:text-foreground">×</Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ===== HABIT LIST ===== */}
                <div className="space-y-2 sm:space-y-3">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-pulse flex flex-col items-center gap-3">
                                <Target className="w-10 h-10 opacity-50" />
                                <span className="text-muted-foreground">Loading habits...</span>
                            </div>
                        </div>
                    ) : filteredHabits.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Target className="w-12 h-12 text-emerald-400 opacity-60" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">
                                        {searchTerm || activeCategory !== "all" ? "No habits match your filter" : "Start Building Habits"}
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        {searchTerm || activeCategory !== "all"
                                            ? "Try a different search or category"
                                            : "Create your first habit to begin your streak!"}
                                    </p>
                                </div>
                                {!searchTerm && activeCategory === "all" && (
                                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2">
                                        <Plus className="w-4 h-4" /> Create First Habit
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        filteredHabits.map((habit, index) => {
                            const completed = isCompletedToday(habit);
                            return (
                                <motion.div
                                    key={habit.id}
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={cn(
                                        "glass-card p-3 sm:p-4 transition-all group",
                                        completed ? "border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent" : "hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Completion Button */}
                                        <button
                                            onClick={() => !completed && completeHabit.mutate(habit)}
                                            disabled={completed}
                                            className={cn(
                                                "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0",
                                                completed
                                                    ? "bg-green-500 text-white shadow-green-500/30"
                                                    : "bg-secondary hover:bg-primary/10 hover:ring-2 hover:ring-primary/20 text-muted-foreground hover:text-primary"
                                            )}
                                        >
                                            <Check className={cn("w-5 h-5", completed ? "stroke-[3px]" : "")} />
                                        </button>

                                        {/* Habit Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className={cn("font-semibold text-sm sm:text-base truncate", completed && "text-green-400")}>{habit.habit_name}</h3>
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                                                    {getCategoryEmoji(habit.category)} {habit.category}
                                                </Badge>
                                                {completed && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-green-500/30 text-green-400 shrink-0">
                                                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />Done
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <StreakFlame streak={habit.streak_count} size="sm" />
                                                    <span className={cn(habit.streak_count > 0 && "text-orange-400 font-medium")}>
                                                        {habit.streak_count}d
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 7-day mini dots */}
                                        <div className="hidden sm:flex gap-1 items-center shrink-0">
                                            {last7Days.map((date, i) => {
                                                const isDone = isCompletedOnDate(habit, date);
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                return (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-medium border transition-all",
                                                            isDone ? "bg-green-500/80 border-green-500 text-white" :
                                                                isToday ? "border-primary/50 bg-primary/10 text-foreground" :
                                                                    "border-border bg-secondary/30 text-muted-foreground"
                                                        )}
                                                        title={date.toDateString()}
                                                    >
                                                        {date.getDate()}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-yellow-400"
                                                onClick={() => handleGetTips(habit)}
                                                disabled={loadingTips}
                                                title="AI Tips"
                                            >
                                                <Lightbulb className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                onClick={() => setEditingHabit({ ...habit })}
                                                title="Edit"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => deleteHabit.mutate(habit.id)}
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* ===== EDIT HABIT DIALOG ===== */}
                <Dialog open={!!editingHabit} onOpenChange={(open) => !open && setEditingHabit(null)}>
                    <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                        <DialogHeader><DialogTitle>Edit Habit</DialogTitle></DialogHeader>
                        {editingHabit && (
                            <div className="space-y-4 pt-4">
                                <Input
                                    placeholder="Habit name"
                                    value={editingHabit.habit_name}
                                    onChange={(e) => setEditingHabit({ ...editingHabit, habit_name: e.target.value })}
                                />
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {HABIT_CATEGORIES.map(c => (
                                            <button
                                                key={c.value}
                                                onClick={() => setEditingHabit({ ...editingHabit, category: c.value })}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                                    editingHabit.category === c.value
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-secondary/50 border-border hover:border-primary/30"
                                                )}
                                            >
                                                {c.emoji} {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Button onClick={handleEditHabit} className="w-full" disabled={updateHabit.isPending}>
                                    {updateHabit.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

            </motion.div>
        </AppLayout>
    );
}

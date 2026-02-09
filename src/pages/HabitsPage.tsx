import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Flame, Check, Trash2, CalendarDays } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo/SEO";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useHabits, Habit } from "@/hooks/useHabits";
import { cn } from "@/lib/utils";

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

    const isCompletedOnDate = (habit: Habit, date: Date) => {
        // We only have last_completed_date and streak_count.
        // We can infer recent history:
        // If streak is N, and last_completed was Today, then Today, Yesterday, ..., (Today - N + 1) are done.
        // If last_completed was Yesterday, then Yesterday, ..., (Yesterday - N + 1) are done.

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));

        // If last completed was today
        const lastCompleted = habit.last_completed_date ? new Date(habit.last_completed_date) : null;
        if (lastCompleted) lastCompleted.setHours(0, 0, 0, 0);

        if (lastCompleted && lastCompleted.getTime() === today.getTime()) {
            // Completed today, so the last N days (including today) are done.
            // diffDays = 0 (Today) -> Done
            // diffDays = 1 (Yesterday) -> Done if streak >= 2
            return diffDays < habit.streak_count;
        } else if (lastCompleted) {
            // Last completed was in the past
            // If it was yesterday, streak preserved.
            const daysSinceLast = Math.round((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceLast === 1) {
                // Completed yesterday
                // diffDays 1 -> done (yesterday)
                // diffDays 0 -> not done (today)
                // diffDays 2 -> done (day before yesterday) if streak >= 2
                return (diffDays > 0) && (diffDays <= habit.streak_count);
            }
        }

        return false;
    };

    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d);
        }
        return days;
    };

    const last7Days = getLast7Days();

    const isCompletedToday = (habit: Habit) => {
        if (!habit.last_completed_date) return false;
        const today = new Date().toISOString().split("T")[0];
        const lastCompleted = habit.last_completed_date.split("T")[0];
        return lastCompleted === today;
    };

    const totalCompleted = habits.filter(isCompletedToday).length;
    const completionRate = habits.length > 0 ? Math.round((totalCompleted / habits.length) * 100) : 0;

    return (
        <AppLayout>
            <SEO title="Habits" description="Build lasting habits with streak tracking and visual progress." />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Habits</h1>
                        <p className="text-muted-foreground">Build lasting habits with streak tracking</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Habit
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Habit</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Input
                                    placeholder="Habit name (e.g., Exercise, Read, Meditate)"
                                    value={newHabitName}
                                    onChange={(e) => setNewHabitName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
                                />
                                <Button onClick={handleAddHabit} className="w-full" disabled={addHabit.isPending}>
                                    {addHabit.isPending ? "Creating..." : "Create Habit"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-3xl font-bold text-primary">{habits.length}</p>
                        <p className="text-sm text-muted-foreground">Total Habits</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-3xl font-bold text-green-400">{totalCompleted}</p>
                        <p className="text-sm text-muted-foreground">Done Today</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-3xl font-bold text-yellow-400">{completionRate}%</p>
                        <p className="text-sm text-muted-foreground">Today's Rate</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-3xl font-bold text-orange-400">
                            {Math.max(...habits.map((h) => h.streak_count), 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Best Streak</p>
                    </motion.div>
                </div>

                {/* Habit List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading habits...</div>
                    ) : habits.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No habits yet. Create your first habit!
                        </div>
                    ) : (
                        habits.map((habit, index) => {
                            const completed = isCompletedToday(habit);
                            return (
                                <motion.div
                                    key={habit.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={cn(
                                        "glass-card p-6 transition-all group",
                                        completed ? "border-green-500/30 bg-green-500/5" : "hover:border-primary/30"
                                    )}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Checkbox-like Button */}
                                            <button
                                                onClick={() => !completed && completeHabit.mutate(habit)}
                                                disabled={completed}
                                                className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm",
                                                    completed
                                                        ? "bg-green-500 text-white scale-110 shadow-green-500/20"
                                                        : "bg-secondary hover:bg-primary/10 hover:ring-2 hover:ring-primary/20 text-muted-foreground"
                                                )}
                                            >
                                                <Check className={cn("w-6 h-6", completed ? "stroke-[3px]" : "")} />
                                            </button>

                                            <div>
                                                <h3 className={cn("font-semibold text-lg", completed && "text-green-500")}>
                                                    {habit.habit_name}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Flame className={cn("w-4 h-4", habit.streak_count > 0 ? "text-orange-500 fill-orange-500" : "")} />
                                                        <span className={cn(habit.streak_count > 0 && "text-orange-500 font-medium")}>
                                                            {habit.streak_count} day streak
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Weekly Visualize */}
                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                            <div className="hidden md:flex gap-1 mr-4">
                                                {last7Days.map((date, i) => {
                                                    const isDone = isCompletedOnDate(habit, date);
                                                    const isToday = date.toDateString() === new Date().toDateString();
                                                    return (
                                                        <div key={i} className="flex flex-col items-center gap-1">
                                                            <div
                                                                className={cn(
                                                                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium border transition-all",
                                                                    isDone
                                                                        ? "bg-green-500 border-green-500 text-white"
                                                                        : isToday
                                                                            ? "border-primary/50 bg-primary/10 text-foreground"
                                                                            : "border-border bg-secondary/30 text-muted-foreground"
                                                                )}
                                                                title={date.toDateString()}
                                                            >
                                                                {date.getDate()}
                                                            </div>
                                                            <span className="text-[9px] text-muted-foreground uppercase">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteHabit.mutate(habit.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
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

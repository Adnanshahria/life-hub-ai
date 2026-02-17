import { useState, useMemo, useEffect } from "react";
import { SEO } from "@/components/seo/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import {
    Plus, Check, Clock, AlertTriangle, Trash2, Pin, PinOff, Edit,
    BookOpen, Wallet, Heart, Folder, Calendar, Timer, DollarSign,
    ChevronDown, Filter, LayoutGrid, List, ArrowUpDown, Archive, Zap, CalendarClock, Package, Boxes, CheckSquare
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { useTasks, Task } from "@/hooks/useTasks";
import { useStudy } from "@/hooks/useStudy";
import { useBudget } from "@/hooks/useBudget";
import { useHabits } from "@/hooks/useHabits";
import { useInventory } from "@/hooks/useInventory";

const priorityColors = {
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const contextIcons = {
    general: <Folder className="w-4 h-4" />,
    study: <BookOpen className="w-4 h-4" />,
    finance: <Wallet className="w-4 h-4" />,
    habit: <Heart className="w-4 h-4" />,
    project: <Folder className="w-4 h-4" />,
    inventory: <Package className="w-4 h-4" />,
};

const statusIcons = {
    todo: <Clock className="w-4 h-4" />,
    "in-progress": <AlertTriangle className="w-4 h-4" />,
    done: <Check className="w-4 h-4" />,
};

interface NewTaskState {
    title: string;
    description: string;
    priority: Task["priority"];
    status: Task["status"];
    due_date: string;
    context_type: Task["context_type"];
    context_id: string;
    budget_id: string;
    expected_cost: string;
    finance_type: "income" | "expense";
    start_time: string;
    end_time: string;
    estimated_duration: string;
}

const defaultNewTask: NewTaskState = {
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    due_date: "",
    context_type: "general",
    context_id: "",
    budget_id: "",
    expected_cost: "",
    finance_type: "expense",
    start_time: "",
    end_time: "",
    estimated_duration: "",
};

export default function TasksPage() {
    const { tasks, isLoading, addTask, updateTask, deleteTask, completeTask } = useTasks();
    const { chapters } = useStudy();
    const { budgets } = useBudget();
    const { habits } = useHabits();
    const { items: inventoryItems } = useInventory();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [filter, setFilter] = useState<string>("all");
    const [contextFilter, setContextFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [tabView, setTabView] = useState<"upcoming" | "active" | "archive">("active");
    const [sortBy, setSortBy] = useState<"priority" | "due_date" | "created" | "alphabetical" | "duration">("due_date");
    const [newTask, setNewTask] = useState<NewTaskState>(defaultNewTask);
    // Time adjustment popup state
    const [showTimeAdjustPopup, setShowTimeAdjustPopup] = useState(false);
    const [pendingDuration, setPendingDuration] = useState<string>("");

    // Group chapters by subject for the selector
    const chaptersBySubject = useMemo(() => {
        const grouped: Record<string, typeof chapters> = {};
        chapters.forEach(ch => {
            if (!grouped[ch.subject]) grouped[ch.subject] = [];
            grouped[ch.subject].push(ch);
        });
        return grouped;
    }, [chapters]);

    const location = useLocation();

    // Check for incoming state to pre-fill task (e.g. from Inventory)
    useEffect(() => {
        if (location.state && location.state.newTask) {
            setNewTask({ ...defaultNewTask, ...location.state.newTask });
            setIsDialogOpen(true);
            // Clear state to prevent reopening on refresh (optional, but good practice)
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleAddTask = async () => {
        if (!newTask.title.trim()) return;
        await addTask.mutateAsync({
            title: newTask.title,
            description: newTask.description || undefined,
            priority: newTask.priority,
            status: newTask.status,
            due_date: newTask.due_date || undefined,
            context_type: newTask.context_type,
            context_id: newTask.context_id || undefined,
            budget_id: newTask.budget_id || undefined,
            expected_cost: newTask.expected_cost ? parseFloat(newTask.expected_cost) : undefined,
            finance_type: newTask.context_type === "finance" ? newTask.finance_type : undefined,
            start_time: newTask.start_time || undefined,
            end_time: newTask.end_time || undefined,
            estimated_duration: newTask.estimated_duration ? parseInt(newTask.estimated_duration) : undefined,
        });
        setNewTask(defaultNewTask);
        setIsDialogOpen(false);
    };

    const handleStatusChange = (task: Task, status: Task["status"]) => {
        if (status === "done") {
            completeTask.mutate(task.id);
        } else {
            updateTask.mutate({ id: task.id, status });
        }
    };

    const handlePinToggle = (task: Task) => {
        updateTask.mutate({ id: task.id, is_pinned: !task.is_pinned });
    };

    const handleStartEdit = (task: Task) => {
        setEditingTask(task);
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTask) return;
        await updateTask.mutateAsync({
            id: editingTask.id,
            title: editingTask.title,
            description: editingTask.description,
            priority: editingTask.priority,
            status: editingTask.status,
            due_date: editingTask.due_date,
            context_type: editingTask.context_type,
            context_id: editingTask.context_id,
            budget_id: editingTask.budget_id,
            expected_cost: editingTask.expected_cost,
            finance_type: editingTask.finance_type,
        });
        setIsEditDialogOpen(false);
        setEditingTask(null);
    };

    // Time calculation helpers
    const timeToMinutes = (time: string): number => {
        if (!time) return 0;
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    };

    const minutesToTime = (mins: number): string => {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Auto-calculate time block fields
    const handleStartTimeChange = (time: string) => {
        const updates: Partial<NewTaskState> = { start_time: time };

        // If end_time exists, calculate duration
        if (time && newTask.end_time) {
            const startMins = timeToMinutes(time);
            const endMins = timeToMinutes(newTask.end_time);
            const duration = endMins >= startMins ? endMins - startMins : (24 * 60 - startMins) + endMins;
            updates.estimated_duration = String(duration);
        }
        // If duration exists but no end_time, calculate end_time
        else if (time && newTask.estimated_duration && !newTask.end_time) {
            const startMins = timeToMinutes(time);
            const endMins = startMins + Number(newTask.estimated_duration);
            updates.end_time = minutesToTime(endMins);
        }

        setNewTask({ ...newTask, ...updates });
    };

    const handleEndTimeChange = (time: string) => {
        const updates: Partial<NewTaskState> = { end_time: time };

        // If start_time exists, calculate duration
        if (time && newTask.start_time) {
            const startMins = timeToMinutes(newTask.start_time);
            const endMins = timeToMinutes(time);
            const duration = endMins >= startMins ? endMins - startMins : (24 * 60 - startMins) + endMins;
            updates.estimated_duration = String(duration);
        }
        // If duration exists but no start_time, calculate start_time
        else if (time && newTask.estimated_duration && !newTask.start_time) {
            const endMins = timeToMinutes(time);
            const startMins = endMins - Number(newTask.estimated_duration);
            updates.start_time = minutesToTime(startMins < 0 ? startMins + 24 * 60 : startMins);
        }

        setNewTask({ ...newTask, ...updates });
    };

    const handleDurationChange = (duration: string) => {
        // If all 3 fields are already set and user changes duration, ask which to adjust
        if (newTask.start_time && newTask.end_time && newTask.estimated_duration) {
            setPendingDuration(duration);
            setShowTimeAdjustPopup(true);
            return;
        }

        const updates: Partial<NewTaskState> = { estimated_duration: duration };

        // If start_time exists, calculate end_time
        if (duration && newTask.start_time) {
            const startMins = timeToMinutes(newTask.start_time);
            const endMins = startMins + Number(duration);
            updates.end_time = minutesToTime(endMins);
        }
        // If end_time exists but no start_time, calculate start_time
        else if (duration && newTask.end_time) {
            const endMins = timeToMinutes(newTask.end_time);
            const startMins = endMins - Number(duration);
            updates.start_time = minutesToTime(startMins < 0 ? startMins + 24 * 60 : startMins);
        }

        setNewTask({ ...newTask, ...updates });
    };

    // Handle time adjustment choice from popup
    const handleTimeAdjustChoice = (adjustField: "start" | "end") => {
        const duration = Number(pendingDuration);
        if (adjustField === "end") {
            // Keep start time, recalculate end time
            const startMins = timeToMinutes(newTask.start_time);
            const endMins = startMins + duration;
            setNewTask({ ...newTask, estimated_duration: pendingDuration, end_time: minutesToTime(endMins) });
        } else {
            // Keep end time, recalculate start time
            const endMins = timeToMinutes(newTask.end_time);
            const startMins = endMins - duration;
            setNewTask({ ...newTask, estimated_duration: pendingDuration, start_time: minutesToTime(startMins < 0 ? startMins + 24 * 60 : startMins) });
        }
        setShowTimeAdjustPopup(false);
        setPendingDuration("");
    };

    // Get context display name
    const getContextName = (task: Task) => {
        if (!task.context_type || task.context_type === "general") return null;
        if (task.context_type === "study" && task.context_id) {
            const chapter = chapters.find(c => c.id === task.context_id);
            return chapter ? `${chapter.subject} - ${chapter.chapter_name} ` : null;
        }
        if (task.context_type === "finance" && task.budget_id) {
            const budget = budgets.find(b => b.id === task.budget_id);
            return budget?.name || null;
        }
        if (task.context_type === "habit" && task.context_id) {
            const habit = habits.find(h => h.id === task.context_id);
            return habit?.habit_name || null;
        }
        if (task.context_type === "inventory" && task.context_id) {
            const item = inventoryItems.find(i => i.id === task.context_id);
            return item?.item_name || null;
        }
        return null;
    };

    // Helper to check if task is upcoming (future due date, not started)
    const isUpcoming = (task: Task) => {
        if (task.status === "done") return false;
        if (!task.due_date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate > today && task.status === "todo";
    };

    // Helper to check if task is overdue (past due date, not done)
    const isOverdue = (task: Task) => {
        if (task.status === "done") return false;
        if (!task.due_date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    };

    // Helper to check if task is due today
    const isDueToday = (task: Task) => {
        if (task.status === "done") return false;
        if (!task.due_date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
    };

    // Helper to check if task is active (today or past, or in-progress, or no due date)
    const isActive = (task: Task) => {
        if (task.status === "done") return false;
        if (task.status === "in-progress") return true;
        if (!task.due_date) return true; // No due date = active
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate <= today;
    };

    // Tab-specific sorting function
    const getSortedTasks = (taskList: Task[], tab: typeof tabView) => {
        return taskList.sort((a, b) => {
            // Pinned first
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            // Tab-specific sorting
            if (tab === "upcoming") {
                // Sort by due date (soonest first)
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            } else if (tab === "active") {
                // Sort by sortBy (date or duration)
                if (sortBy === "duration") {
                    const aDur = a.estimated_duration || 0;
                    const bDur = b.estimated_duration || 0;
                    return bDur - aDur; // Longest first
                } else {
                    // Default: due date
                    if (!a.due_date && !b.due_date) return 0;
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }
            } else if (tab === "archive") {
                // Sort by completed date (most recent first)
                return new Date(b.completed_at || b.created_at || 0).getTime() - new Date(a.completed_at || a.created_at || 0).getTime();
            }

            // Fallback: general sortBy
            switch (sortBy) {
                case "priority": {
                    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
                }
                case "due_date": {
                    if (!a.due_date && !b.due_date) return 0;
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }
                case "created": {
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                }
                case "alphabetical": {
                    return a.title.localeCompare(b.title);
                }
                default:
                    return 0;
            }
        });
    };

    // Filter tasks based on tabView, status filter, and context filter
    const filteredTasks = useMemo(() => {
        const filtered = tasks.filter((task) => {
            // Tab filter
            let tabMatch = true;
            if (tabView === "upcoming") tabMatch = isUpcoming(task);
            else if (tabView === "active") {
                // In Grid, show all active tasks including overdue.
                // In List, exclude overdue because they are shown in a separate section.
                tabMatch = isActive(task) && (viewMode === "grid" || !isOverdue(task));
            }
            else if (tabView === "archive") tabMatch = task.status === "done";

            const statusMatch = filter === "all" || task.status === filter;
            const contextMatch = contextFilter === "all" || task.context_type === contextFilter;
            return tabMatch && statusMatch && contextMatch;
        });
        return getSortedTasks(filtered, tabView);
    }, [tasks, filter, contextFilter, tabView, sortBy, viewMode]);

    // Overdue tasks for the Active tab
    const overdueTasks = useMemo(() => {
        if (tabView !== "active") return [];
        const filtered = tasks.filter((task) => {
            const contextMatch = contextFilter === "all" || task.context_type === contextFilter;
            return isOverdue(task) && contextMatch;
        });
        return getSortedTasks(filtered, "active");
    }, [tasks, tabView, contextFilter, sortBy]);

    const taskCounts = {
        all: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        "in-progress": tasks.filter((t) => t.status === "in-progress").length,
        done: tasks.filter((t) => t.status === "done").length,
    };

    const tabCounts = {
        upcoming: tasks.filter(isUpcoming).length,
        active: tasks.filter(isActive).length,
        archive: tasks.filter((t) => t.status === "done").length,
        overdue: tasks.filter(isOverdue).length,
    };

    return (
        <AppLayout>
            <SEO title="Tasks" description="Manage your tasks, projects, and to-dos." />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 sm:space-y-6"
            >
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                            <CheckSquare className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
                            <p className="text-sm text-muted-foreground">Your central productivity hub</p>
                        </div>
                    </div>

                    {/* Single-row controls */}
                    {/* Single-row controls - Top Toolbar */}
                    <div className="top-toolbar">

                        {/* Tab Dropdown */}
                        <Select value={tabView} onValueChange={(v) => setTabView(v as typeof tabView)}>
                            <SelectTrigger className="w-auto min-w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="upcoming">Soon ({tabCounts.upcoming})</SelectItem>
                                <SelectItem value="active">Active ({tabCounts.active})</SelectItem>
                                <SelectItem value="archive">Archive</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Context Filter */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs sm:text-sm">
                                    <Filter className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Context</span>
                                    <ChevronDown className="w-3 h-3" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                                {["all", "general", "study", "finance", "habit", "inventory"].map((ctx) => (
                                    <button
                                        key={ctx}
                                        onClick={() => setContextFilter(ctx)}
                                        className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${contextFilter === ctx ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}
                                    >
                                        {ctx !== "all" && contextIcons[ctx as keyof typeof contextIcons]}
                                        {ctx.charAt(0).toUpperCase() + ctx.slice(1)}
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>

                        {/* Sort Dropdown */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs sm:text-sm">
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Sort</span>
                                    <ChevronDown className="w-3 h-3" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                                {[
                                    { value: "priority", label: "Priority" },
                                    { value: "due_date", label: "Due Date" },
                                    { value: "created", label: "Recently Added" },
                                    { value: "alphabetical", label: "A-Z" },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSortBy(option.value as typeof sortBy)}
                                        className={`w-full text-left px-3 py-2 rounded-md ${sortBy === option.value ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>

                        {/* View Toggle */}
                        <div className="flex bg-secondary rounded-lg p-0.5 shrink-0">
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                title="List View"
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Spacer to push + New to the right */}
                        <div className="flex-1" />

                        {/* Add Task */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 h-8 shadow-lg shadow-primary/20">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">New</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-xl">
                                <DialogHeader>
                                    <DialogTitle>Create New Task</DialogTitle>
                                    <DialogDescription>Add a new task to your list. Fill in the details below.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <Input
                                        placeholder="Task title..."
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    />

                                    <Textarea
                                        placeholder="Description (optional)..."
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                        className="min-h-[80px]"
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Select
                                            value={newTask.priority}
                                            onValueChange={(v) => setNewTask({ ...newTask, priority: v as Task["priority"] })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Priority" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">🟢 Low</SelectItem>
                                                <SelectItem value="medium">🟡 Medium</SelectItem>
                                                <SelectItem value="high">🟠 High</SelectItem>
                                                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <DatePicker
                                            value={newTask.due_date}
                                            onChange={(date) => setNewTask({ ...newTask, due_date: date })}
                                            placeholder="Due date"
                                        />
                                    </div>

                                    {/* Context Selector */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Folder className="w-4 h-4" />
                                            Link to Module
                                        </label>
                                        <Select
                                            value={newTask.context_type}
                                            onValueChange={(v) => setNewTask({ ...newTask, context_type: v as Task["context_type"], context_id: "" })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="general">📁 General</SelectItem>
                                                <SelectItem value="study">📚 Study</SelectItem>
                                                <SelectItem value="finance">💰 Finance</SelectItem>
                                                <SelectItem value="habit">💪 Habit</SelectItem>
                                                <SelectItem value="inventory">📦 Inventory</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Dynamic Context ID Selector */}
                                        {newTask.context_type === "study" && (
                                            <Select
                                                value={newTask.context_id}
                                                onValueChange={(v) => setNewTask({ ...newTask, context_id: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select chapter..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(chaptersBySubject).map(([subject, chs]) => (
                                                        <SelectGroup key={subject}>
                                                            <SelectLabel>{subject}</SelectLabel>
                                                            {chs.map(ch => (
                                                                <SelectItem key={ch.id} value={ch.id}>
                                                                    {ch.chapter_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {newTask.context_type === "habit" && (
                                            <Select
                                                value={newTask.context_id}
                                                onValueChange={(v) => setNewTask({ ...newTask, context_id: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select habit..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {habits.map(habit => (
                                                        <SelectItem key={habit.id} value={habit.id}>
                                                            {habit.habit_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {newTask.context_type === "inventory" && (
                                            <Select
                                                value={newTask.context_id}
                                                onValueChange={(v) => setNewTask({ ...newTask, context_id: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select item..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {inventoryItems.map(item => (
                                                        <SelectItem key={item.id} value={item.id}>
                                                            {item.item_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {/* Finance Fields */}
                                    {(newTask.context_type === "finance" || newTask.context_type === "general") && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                Budget & Cost
                                            </label>

                                            {/* Income/Expense Toggle - Only show when Finance is selected */}
                                            {newTask.context_type === "finance" && (
                                                <Tabs
                                                    value={newTask.finance_type}
                                                    onValueChange={(v) => setNewTask({ ...newTask, finance_type: v as "income" | "expense" })}
                                                    className="w-full"
                                                >
                                                    <TabsList className="w-full">
                                                        <TabsTrigger
                                                            value="expense"
                                                            className="flex-1 data-[state=active]:bg-red-500 data-[state=active]:text-white"
                                                        >
                                                            💸 Expense
                                                        </TabsTrigger>
                                                        <TabsTrigger
                                                            value="income"
                                                            className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white"
                                                        >
                                                            💰 Income
                                                        </TabsTrigger>
                                                    </TabsList>
                                                </Tabs>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Budget selector - only for Expenses, not Income */}
                                                {(newTask.context_type !== "finance" || newTask.finance_type === "expense") && (
                                                    <Select
                                                        value={newTask.budget_id}
                                                        onValueChange={(v) => setNewTask({ ...newTask, budget_id: v })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select budget..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {budgets.filter(b => b.type === "budget").map(budget => (
                                                                <SelectItem key={budget.id} value={budget.id}>
                                                                    {budget.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <Input
                                                    type="number"
                                                    placeholder={newTask.finance_type === "income" ? "Expected income (৳)" : "Expected cost (৳)"}
                                                    value={newTask.expected_cost}
                                                    onChange={(e) => setNewTask({ ...newTask, expected_cost: e.target.value })}
                                                    className={newTask.context_type === "finance" && newTask.finance_type === "income" ? "col-span-2" : ""}
                                                />
                                            </div>

                                            {/* Info when Finance is selected */}
                                            {newTask.context_type === "finance" && newTask.expected_cost && (
                                                <p className="text-xs text-muted-foreground">
                                                    ℹ️ When this task is marked done, ৳{newTask.expected_cost} will be recorded as {newTask.finance_type}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Time Blocking */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Time Block
                                        </label>
                                        <div className="grid grid-cols-3 gap-4">
                                            <TimePicker
                                                value={newTask.start_time}
                                                onChange={handleStartTimeChange}
                                                placeholder="Start"
                                            />
                                            <TimePicker
                                                value={newTask.end_time}
                                                onChange={handleEndTimeChange}
                                                placeholder="End"
                                            />
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    placeholder="Duration"
                                                    value={newTask.estimated_duration}
                                                    onChange={(e) => handleDurationChange(e.target.value)}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button onClick={handleAddTask} className="w-full" disabled={addTask.isPending}>
                                        {addTask.isPending ? "Creating..." : "Create Task"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Edit Task Dialog */}
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-xl">
                                <DialogHeader>
                                    <DialogTitle>Edit Task</DialogTitle>
                                    <DialogDescription>Modify the details of your existing task.</DialogDescription>
                                </DialogHeader>
                                {editingTask && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium">Title</label>
                                            <Input
                                                value={editingTask.title}
                                                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Description</label>
                                            <Textarea
                                                value={editingTask.description || ""}
                                                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium">Priority</label>
                                                <Select
                                                    value={editingTask.priority}
                                                    onValueChange={(v) => setEditingTask({ ...editingTask, priority: v as Task["priority"] })}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="low">Low</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="high">High</SelectItem>
                                                        <SelectItem value="urgent">Urgent</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">Status</label>
                                                <Select
                                                    value={editingTask.status}
                                                    onValueChange={(v) => setEditingTask({ ...editingTask, status: v as Task["status"] })}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="todo">To Do</SelectItem>
                                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                                        <SelectItem value="done">Done</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Link to Module</label>
                                            <Select
                                                value={editingTask.context_type || "general"}
                                                onValueChange={(v) => setEditingTask({ ...editingTask, context_type: v as Task["context_type"], context_id: "" })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="general">📁 General</SelectItem>
                                                    <SelectItem value="study">📚 Study</SelectItem>
                                                    <SelectItem value="finance">💰 Finance</SelectItem>
                                                    <SelectItem value="habit">💪 Habit</SelectItem>
                                                    <SelectItem value="inventory">📦 Inventory</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {editingTask.context_type === "study" && (
                                                <Select
                                                    value={editingTask.context_id || ""}
                                                    onValueChange={(v) => setEditingTask({ ...editingTask, context_id: v })}
                                                >
                                                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select chapter..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(chaptersBySubject).map(([subject, chs]) => (
                                                            <SelectGroup key={subject}>
                                                                <SelectLabel>{subject}</SelectLabel>
                                                                {chs.map(ch => <SelectItem key={ch.id} value={ch.id}>{ch.chapter_name}</SelectItem>)}
                                                            </SelectGroup>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            {editingTask.context_type === "inventory" && (
                                                <Select
                                                    value={editingTask.context_id || ""}
                                                    onValueChange={(v) => setEditingTask({ ...editingTask, context_id: v })}
                                                >
                                                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select item..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {inventoryItems.map(item => (
                                                            <SelectItem key={item.id} value={item.id}>{item.item_name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            {editingTask.context_type === "finance" && (
                                                <div className="mt-4 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-sm font-medium">Expected Cost (৳)</label>
                                                        <Input
                                                            type="number"
                                                            value={editingTask.expected_cost || ""}
                                                            onChange={(e) => setEditingTask({ ...editingTask, expected_cost: Number(e.target.value) || undefined })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium">Type</label>
                                                        <Select
                                                            value={editingTask.finance_type || "expense"}
                                                            onValueChange={(v) => setEditingTask({ ...editingTask, finance_type: v as "income" | "expense" })}
                                                        >
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="expense">Expense</SelectItem>
                                                                <SelectItem value="income">Income</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium">Due Date</label>
                                                <DatePicker
                                                    value={editingTask.due_date || ""}
                                                    onChange={(date) => setEditingTask({ ...editingTask, due_date: date })}
                                                    placeholder="Due date"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleSaveEdit}>
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Time Adjustment Popup */}
                        <Dialog open={showTimeAdjustPopup} onOpenChange={setShowTimeAdjustPopup}>
                            <DialogContent className="max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Adjust Time Block</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Which time would you like to keep? The other will be recalculated based on the new duration ({pendingDuration} min).
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleTimeAdjustChoice("start")}
                                        className="flex flex-col gap-1 h-auto py-3"
                                    >
                                        <span className="font-medium">Keep End Time</span>
                                        <span className="text-xs text-muted-foreground">Adjust Start Time</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleTimeAdjustChoice("end")}
                                        className="flex flex-col gap-1 h-auto py-3"
                                    >
                                        <span className="font-medium">Keep Start Time</span>
                                        <span className="text-xs text-muted-foreground">Adjust End Time</span>
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>



                {/* Task Content - List or Kanban */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No tasks found. Add your first task!
                        </div>
                    ) : viewMode === "list" ? (
                        // LIST VIEW
                        <AnimatePresence>
                            {filteredTasks.map((task) => {
                                const contextName = getContextName(task);
                                return (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className={`glass-card p-3 sm:p-4 rounded-xl group ${task.is_pinned ? "border-primary/50 bg-primary/5" : ""}`}
                                    >
                                        <div className="flex items-start gap-2 sm:gap-3">
                                            {/* Status Button */}
                                            <button
                                                onClick={() => {
                                                    const nextStatus = {
                                                        todo: "in-progress",
                                                        "in-progress": "done",
                                                        done: "todo",
                                                    } as const;
                                                    handleStatusChange(task, nextStatus[task.status]);
                                                }}
                                                className={`p-2 rounded-full transition-colors shrink-0 ${task.status === "done"
                                                    ? "bg-green-500/20 text-green-400"
                                                    : task.status === "in-progress"
                                                        ? "bg-yellow-500/20 text-yellow-400"
                                                        : "bg-muted hover:bg-muted/80"
                                                    }`}
                                            >
                                                {statusIcons[task.status]}
                                            </button>

                                            {/* Task Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                                                        {task.title}
                                                    </p>
                                                    {task.is_pinned && (
                                                        <Pin className="w-3 h-3 text-primary" />
                                                    )}
                                                </div>

                                                {/* Context Badge */}
                                                {contextName && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-primary">
                                                            {contextIcons[task.context_type as keyof typeof contextIcons]}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{contextName}</span>
                                                    </div>
                                                )}

                                                {/* Meta Info */}
                                                <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 flex-wrap text-xs sm:text-sm text-muted-foreground">
                                                    {task.due_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {task.due_date}
                                                        </span>
                                                    )}
                                                    {task.start_time && task.end_time && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {task.start_time} - {task.end_time}
                                                        </span>
                                                    )}
                                                    {task.estimated_duration && (
                                                        <span className="flex items-center gap-1">
                                                            <Timer className="w-3 h-3" />
                                                            {task.estimated_duration}m
                                                        </span>
                                                    )}
                                                    {task.expected_cost && (
                                                        <span className={`flex items-center gap-1 font-medium ${task.finance_type === "income"
                                                            ? "text-green-500"
                                                            : "text-red-500"
                                                            }`}>
                                                            <DollarSign className="w-3 h-3" />
                                                            {task.finance_type === "income" ? "+" : "-"}৳{task.expected_cost.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Priority Badge */}
                                            <Badge className={priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}>
                                                {task.priority}
                                            </Badge>

                                            {/* Actions */}
                                            <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handlePinToggle(task)}
                                                    className="text-muted-foreground hover:text-primary"
                                                >
                                                    {task.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleStartEdit(task)}
                                                    className="text-muted-foreground hover:text-blue-400"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => completeTask.mutate(task.id)}
                                                    className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteTask.mutate(task.id)}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    ) : (
                        // GRID VIEW (2 Columns)
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <AnimatePresence mode="popLayout">
                                {filteredTasks.map((task, index) => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        className={`glass-card p-3 sm:p-4 rounded-xl flex flex-col justify-between group hover:border-primary/30 transition-all ${task.status === "done" ? "opacity-75 hover:opacity-100 bg-secondary/10" : ""
                                            } ${task.is_pinned ? "border-primary/50 bg-primary/5" : ""}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-2 items-center">
                                                <Badge
                                                    variant="outline"
                                                    className={`${priorityColors[task.priority]} capitalize shadow-sm`}
                                                >
                                                    {task.priority}
                                                </Badge>
                                                {task.is_pinned && <Pin className="w-3 h-3 text-primary fill-primary/20" />}
                                                {task.status === "done" && (
                                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200">
                                                        Done
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleStartEdit(task)}
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => deleteTask.mutate(task.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <h3 className={`font-semibold text-lg mb-1 leading-tight ${task.status === "done" ? "text-muted-foreground" : ""}`}>
                                                {task.title}
                                            </h3>
                                            {task.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                {task.due_date && (
                                                    <span className={`flex items-center gap-1.5 ${isOverdue(task) && task.status !== "done" ? "text-red-400 font-medium" : ""}`}>
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                                {task.expected_cost && (
                                                    <span className="flex items-center gap-1.5">
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                        {task.expected_cost.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>

                                            {task.status !== "done" ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-3 text-xs hover:bg-green-500/10 hover:text-green-600"
                                                    onClick={() => completeTask.mutate(task.id)}
                                                >
                                                    <Check className="w-3.5 h-3.5 mr-1.5" />
                                                    Complete
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-3 text-xs hover:bg-secondary"
                                                    onClick={() => handleStatusChange(task, "todo")}
                                                >
                                                    <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                                                    Reopen
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Overdue Tasks Section - Only show in Active tab */}
                {tabView === "active" && viewMode === "list" && overdueTasks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 sm:mt-6"
                    >
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                                <h3 className="font-semibold text-sm sm:text-base text-red-400">Overdue Tasks</h3>
                                <Badge variant="destructive" className="ml-auto text-[10px] sm:text-xs">
                                    {overdueTasks.length}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                {overdueTasks.map((task, index) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center justify-between p-2.5 sm:p-3 bg-background/50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-xs text-muted-foreground font-mono">{index + 1}.</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{task.title}</p>
                                                <p className="text-xs text-red-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Badge variant="outline" className={priorityColors[task.priority]}>
                                                {task.priority}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleStartEdit(task)}
                                                className="text-muted-foreground hover:text-blue-400"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => completeTask.mutate(task.id)}
                                                className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                                            >
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteTask.mutate(task.id)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AppLayout>
    );
}

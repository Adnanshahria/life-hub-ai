import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { SEO } from "@/components/seo/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import {
    Plus, Check, Clock, AlertTriangle, Trash2, Pin, PinOff, Edit,
    BookOpen, Wallet, Heart, Folder, Calendar as CalendarIcon, Timer, DollarSign,
    ChevronDown, Filter, LayoutGrid, List, ArrowUpDown, Archive, Zap, CalendarClock, Package, Boxes, CheckSquare, GraduationCap, MoreVertical, SlidersHorizontal, ChevronLeft, ChevronRight
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { DateStrip } from "@/components/tasks/DateStrip";
import { format, isSameDay, parseISO, startOfDay, addDays } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel
} from "@/components/ui/select";
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
    const { subjects, chapters, parts, chaptersBySubject: studyChaptersBySubject, partsByChapter } = useStudy();
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

    // Date Selection State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Helpers
    const getTaskDateKey = (date: Date) => format(date, "yyyy-MM-dd");


    // Force list view on mobile (grid toggle is hidden on mobile)
    useEffect(() => {
        if (window.innerWidth < 768) setViewMode("list");
    }, []);

    // Import Study State
    const [importStudyOpen, setImportStudyOpen] = useState(false);
    const [importSubjectId, setImportSubjectId] = useState("");
    const [importChapterId, setImportChapterId] = useState("");

    // Study import in form
    const [studySubjectId, setStudySubjectId] = useState("");
    const [studyChapterId, setStudyChapterId] = useState("");
    const [selectedStudyParts, setSelectedStudyParts] = useState<string[]>([]);

    // Get chapters for selected subject
    const studyChaptersForSubject = useMemo(() => {
        if (!studySubjectId) return [];
        return chapters.filter(c => c.subject_id === studySubjectId);
    }, [studySubjectId, chapters]);

    // Get parts for selected chapter, organized as a tree
    const studyPartsForChapter = useMemo(() => {
        if (!studyChapterId) return [];
        return (partsByChapter[studyChapterId] || []).filter(p => !p.parent_id);
    }, [studyChapterId, partsByChapter]);

    // Get children of a part
    const getChildParts = (parentId: string) => {
        return parts.filter(p => p.parent_id === parentId);
    };

    // Toggle a part in the selected list
    const toggleStudyPart = (partId: string) => {
        setSelectedStudyParts(prev =>
            prev.includes(partId) ? prev.filter(id => id !== partId) : [...prev, partId]
        );
    };

    // Get a part by ID
    const getPartById = (id: string) => parts.find(p => p.id === id);

    // Group chapters by subject for the selector
    const chaptersBySubject = useMemo(() => {
        const grouped: Record<string, typeof chapters> = {};
        chapters.forEach(ch => {
            const subject = subjects.find(s => s.id === ch.subject_id)?.name || "Unknown";
            if (!grouped[subject]) grouped[subject] = [];
            grouped[subject].push(ch);
        });
        return grouped;
    }, [chapters, subjects]);

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
            if (chapter) {
                const subject = subjects.find(s => s.id === chapter.subject_id);
                return `${subject?.name || "Study"} - ${chapter.name} `;
            }
            return null;
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
    // --- NEW LOGIC: Daily View + Overdue on Today ---

    // 1. Calculate Counts for DateStrip (Past 7 days + Next 14 days)
    const dateStripCounts = useMemo(() => {
        const counts: Record<string, { total: number; done: number }> = {};
        tasks.forEach(t => {
            if (t.due_date) {
                if (!counts[t.due_date]) counts[t.due_date] = { total: 0, done: 0 };
                counts[t.due_date].total++;
                if (t.status === "done") counts[t.due_date].done++;
            }
        });
        return counts;
    }, [tasks]);

    // 2. Filter Tasks for VALID Daily View
    const filteredTasks = useMemo(() => {
        const today = startOfDay(new Date());
        const selDateKey = getTaskDateKey(selectedDate);
        const isToday = isSameDay(selectedDate, today);

        return tasks.filter(task => {
            // Context Filter override
            if (contextFilter !== "all" && task.context_type !== contextFilter) return false;

            // Date Logic
            if (task.due_date === selDateKey) return true; // Exact match

            // Overdue Logic: Only show on "Today"
            if (isToday && task.due_date && new Date(task.due_date) < today && task.status !== "done") {
                return true;
            }

            return false;
        }).sort((a, b) => {
            // Simple Sort: Pinned -> Status (Done last) -> Priority -> Created
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            if (a.status === "done" && b.status !== "done") return 1;
            if (a.status !== "done" && b.status === "done") return -1;

            // Priority sorting
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            const pA = priorityOrder[a.priority] || 2;
            const pB = priorityOrder[b.priority] || 2;
            if (pA !== pB) return pA - pB;

            return 0;
        });
    }, [tasks, selectedDate, contextFilter]);

    // --- UI ---

    return (
        <AppLayout className="!pt-0">
            <SEO title="Tasks" description="Manage your tasks, projects, and to-dos." />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 sm:space-y-6"
            >
                {/* Header with DateStrip */}
                <div className="flex flex-col gap-4">
                    {/* Rollable Date Strip */}
                    <DateStrip
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        taskCounts={dateStripCounts}
                    />
                </div>

                {/* Main Content */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground/50">
                            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                                <CalendarIcon className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-lg font-medium text-foreground/80">No tasks for this day</p>
                            <p className="text-sm max-w-xs mt-1">Enjoy your free time or plan ahead!</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredTasks.map(task => (

                                <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group bg-card/50 hover:bg-card/80 border border-border/40 hover:border-primary/20 backdrop-blur-sm rounded-xl p-3 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Checkbox / Status */}
                                        <button
                                            onClick={() => handleStatusChange(task, task.status === "done" ? "todo" : "done")}
                                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${task.status === "done"
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "border-muted-foreground/30 hover:border-primary/50"
                                                }`}
                                        >
                                            {task.status === "done" && <Check className="w-3.5 h-3.5" />}
                                        </button>

                                        {/* Title & Meta */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium truncate ${task.status === "done" ? "text-muted-foreground line-through decoration-border" : "text-foreground"}`}>
                                                    {task.title}
                                                </span>
                                                {task.is_pinned && <Pin className="w-3 h-3 text-primary/50" />}
                                            </div>

                                            {/* Sub-meta row */}
                                            <div className="flex items-center gap-3 mt-1">
                                                {/* Priority Dot */}
                                                <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' :
                                                    task.priority === 'high' ? 'bg-orange-500' :
                                                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                                    }`} />

                                                {/* Time / Duration */}
                                                {(task.start_time || task.estimated_duration) && (
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {task.start_time || ''} {task.estimated_duration ? `(${task.estimated_duration}m)` : ''}
                                                    </span>
                                                )}

                                                {/* Context */}
                                                {getContextName(task) && (
                                                    <span className="text-[10px] text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded">
                                                        {getContextName(task)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions (Hover) */}
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleStartEdit(task)}>
                                                <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => deleteTask.mutate(task.id)}>
                                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>

            {/* Add Task */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    {/* Desktop Button */}
                    <Button size="sm" className="hidden sm:flex gap-1.5 h-8 shadow-lg shadow-primary/20">
                        <Plus className="w-3.5 h-3.5" />
                        <span>New</span>
                    </Button>
                </DialogTrigger>
                {/* Mobile Floating Button - Portal out to body to avoid transform clipping */}
                {createPortal(
                    <div className="fixed bottom-20 right-20 z-50 sm:hidden">
                        <DialogTrigger asChild>
                            <Button
                                size="icon"
                                className="w-12 h-12 rounded-full shadow-lg shadow-primary/25 glow-primary bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <Plus className="w-6 h-6" />
                            </Button>
                        </DialogTrigger>
                    </div>,
                    document.body
                )}
                <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-2xl p-0 gap-0 border-0 shadow-2xl">
                    <div className="p-6 bg-gradient-to-b from-primary/5 via-background to-background">
                        <DialogHeader className="mb-6 text-center">
                            <DialogTitle className="text-xl font-bold tracking-tight">Create New Task</DialogTitle>
                            <DialogDescription>Add a new task to your list. Fill in the details below.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5">
                            {/* Title & Description */}
                            <div className="space-y-3">
                                <Input
                                    placeholder="Task title..."
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="h-12 text-base font-semibold rounded-xl border-input bg-background/60 shadow-sm placeholder:font-normal"
                                />

                                <Textarea
                                    placeholder="Add a description..."
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    className="min-h-[70px] rounded-xl bg-secondary/20 border-border/30 resize-none text-sm"
                                    rows={2}
                                />
                            </div>

                            {/* Priority & Date Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">Priority</label>
                                    <Select value={newTask.priority} onValueChange={(val) => setNewTask({ ...newTask, priority: val as Task["priority"] })}>
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">🟢 Low</SelectItem>
                                            <SelectItem value="medium">🟡 Medium</SelectItem>
                                            <SelectItem value="high">🟠 High</SelectItem>
                                            <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">Due Date</label>
                                    <DatePicker
                                        value={newTask.due_date.split('T')[0]}
                                        onChange={(date) => setNewTask({ ...newTask, due_date: date })}
                                        placeholder="Pick a date"
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Module / Context */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground ml-1 flex items-center gap-1.5">
                                    <Folder className="w-3.5 h-3.5" /> Link to Module
                                </label>
                                <div className="flex gap-2">
                                    <Select value={newTask.context_type} onValueChange={(val) => {
                                        setNewTask({ ...newTask, context_type: val as Task["context_type"], context_id: "" });
                                        if (val !== "study") { setStudySubjectId(""); setStudyChapterId(""); setSelectedStudyParts([]); }
                                    }}>
                                        <SelectTrigger className="h-11 w-1/3 shrink-0 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="general">General</SelectItem>
                                            <SelectItem value="study">Study</SelectItem>
                                            <SelectItem value="finance">Finance</SelectItem>
                                            <SelectItem value="habit">Habit</SelectItem>
                                            <SelectItem value="inventory">Inventory</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className="flex-1">
                                        {newTask.context_type === "general" ? (
                                            <div className="h-11 flex items-center px-4 rounded-xl border border-dashed border-muted-foreground/20 text-muted-foreground text-sm bg-secondary/10 w-full">
                                                No specific module linked
                                            </div>
                                        ) : newTask.context_type === "study" ? (
                                            <Select value={studySubjectId} onValueChange={(val) => { setStudySubjectId(val); setStudyChapterId(""); setSelectedStudyParts([]); setNewTask({ ...newTask, context_id: "" }); }}>
                                                <SelectTrigger className="h-11 w-full rounded-xl">
                                                    <SelectValue placeholder="Select subject..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {subjects.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Select value={newTask.context_id || ""} onValueChange={(val) => setNewTask({ ...newTask, context_id: val })}>
                                                <SelectTrigger className="h-11 w-full rounded-xl">
                                                    <SelectValue placeholder="Select item..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {newTask.context_type === "habit" && habits.map(h => (
                                                        <SelectItem key={h.id} value={h.id}>{h.habit_name}</SelectItem>
                                                    ))}
                                                    {newTask.context_type === "inventory" && inventoryItems.map(i => (
                                                        <SelectItem key={i.id} value={i.id}>{i.item_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                {/* Study: Chapter selector + Part tree */}
                                {newTask.context_type === "study" && studySubjectId && (
                                    <div className="mt-2 space-y-2">
                                        <Select value={studyChapterId} onValueChange={(val) => { setStudyChapterId(val); setNewTask({ ...newTask, context_id: val }); setSelectedStudyParts([]); }}>
                                            <SelectTrigger className="h-10 rounded-xl">
                                                <SelectValue placeholder="Select chapter..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {studyChaptersForSubject.map(ch => (
                                                    <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Parts Tree */}
                                        {studyChapterId && studyPartsForChapter.length > 0 && (
                                            <div className="rounded-xl border border-border/50 bg-secondary/10 p-3 space-y-1 max-h-48 overflow-y-auto">
                                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Import Parts as Sub-tasks</p>
                                                {(() => {
                                                    const renderPartTree = (partList: typeof parts, depth: number = 0) => {
                                                        return partList.map(part => {
                                                            const children = getChildParts(part.id);
                                                            const isSelected = selectedStudyParts.includes(part.id);
                                                            const statusIcon = part.status === "completed" ? "✅" : part.status === "in-progress" ? "🔶" : "⬜";
                                                            return (
                                                                <div key={part.id}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleStudyPart(part.id)}
                                                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all hover:bg-primary/5 ${isSelected ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                                                                            }`}
                                                                        style={{ paddingLeft: `${8 + depth * 16}px` }}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                                                            }`}>
                                                                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                                                        </div>
                                                                        <span className="text-xs">{statusIcon}</span>
                                                                        <span className="truncate flex-1 text-left">{part.name}</span>
                                                                        {part.estimated_minutes > 0 && (
                                                                            <span className="text-[10px] text-muted-foreground shrink-0">{part.estimated_minutes}m</span>
                                                                        )}
                                                                    </button>
                                                                    {children.length > 0 && renderPartTree(children, depth + 1)}
                                                                </div>
                                                            );
                                                        });
                                                    };
                                                    return renderPartTree(studyPartsForChapter);
                                                })()}
                                            </div>
                                        )}

                                        {studyChapterId && studyPartsForChapter.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic px-1">No parts in this chapter.</p>
                                        )}

                                        {/* Selected Parts Visual */}
                                        {selectedStudyParts.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Imported ({selectedStudyParts.length})</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selectedStudyParts.map(id => {
                                                        const part = getPartById(id);
                                                        if (!part) return null;
                                                        return (
                                                            <span
                                                                key={id}
                                                                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-medium bg-primary/15 text-primary border border-primary/20"
                                                            >
                                                                <BookOpen className="w-3 h-3" />
                                                                {part.name}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleStudyPart(id)}
                                                                    className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3 rotate-45" />
                                                                </button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Finance Section */}
                            {newTask.context_type === "finance" && (
                                <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5" /> Budget & Cost
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 flex gap-2 mb-1">
                                            <button
                                                onClick={() => setNewTask({ ...newTask, finance_type: "expense" })}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${newTask.finance_type === "expense" ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                                            >
                                                💸 Expense
                                            </button>
                                            <button
                                                onClick={() => setNewTask({ ...newTask, finance_type: "income" })}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${newTask.finance_type === "income" ? "bg-green-500 text-white shadow-md shadow-green-500/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                                            >
                                                💰 Income
                                            </button>
                                        </div>

                                        {newTask.finance_type === "expense" && (
                                            <div className="col-span-1">
                                                <Select value={newTask.budget_id} onValueChange={(val) => setNewTask({ ...newTask, budget_id: val })}>
                                                    <SelectTrigger className="h-10 rounded-lg text-xs">
                                                        <SelectValue placeholder="Select budget..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {budgets.filter(b => b.type === "budget").map(b => (
                                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        <div className={`relative ${newTask.finance_type === "income" ? "col-span-2" : "col-span-1"}`}>
                                            <Input
                                                type="number"
                                                placeholder={newTask.finance_type === "income" ? "Expected income" : "Expected cost"}
                                                value={newTask.expected_cost}
                                                onChange={(e) => setNewTask({ ...newTask, expected_cost: e.target.value })}
                                                className="h-10 rounded-lg bg-background/50 pl-7 text-xs"
                                            />
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">৳</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time Section - Single Row */}
                            <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Time Block
                                </label>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <span className="text-[10px] text-muted-foreground ml-0.5">Start</span>
                                        <TimePicker
                                            value={newTask.start_time}
                                            onChange={(val) => handleStartTimeChange(val)}
                                            placeholder="Start"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <span className="text-[10px] text-muted-foreground ml-0.5">End</span>
                                        <TimePicker
                                            value={newTask.end_time}
                                            onChange={(val) => handleEndTimeChange(val)}
                                            placeholder="End"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1 relative">
                                        <span className="text-[10px] text-muted-foreground ml-0.5">Duration</span>
                                        <Input
                                            type="number"
                                            placeholder="—"
                                            value={newTask.estimated_duration}
                                            onChange={(e) => handleDurationChange(e.target.value)}
                                            className="h-8 rounded-lg bg-background/50 text-xs pr-8"
                                        />
                                        <span className="absolute right-2 bottom-[5px] text-[10px] text-muted-foreground">min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-secondary/30 border-t border-border/50">
                        <Button
                            onClick={handleAddTask}
                            className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:to-primary"
                            disabled={addTask.isPending}
                        >
                            {addTask.isPending ? "Creating..." : "Create Task"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-2xl p-0 gap-0 border-0 shadow-2xl">
                    {editingTask && (
                        <>
                            <div className="p-6 bg-gradient-to-b from-primary/5 via-background to-background">
                                <DialogHeader className="mb-6 text-center">
                                    <DialogTitle className="text-xl font-bold tracking-tight">Edit Task</DialogTitle>
                                    <DialogDescription>Modify the details of your existing task.</DialogDescription>
                                </DialogHeader>

                                <div className="space-y-5">
                                    {/* Title & Description */}
                                    <div className="space-y-3">
                                        <Input
                                            placeholder="Task title..."
                                            value={editingTask.title}
                                            onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                            className="h-12 text-base font-semibold rounded-xl border-input bg-background/60 shadow-sm placeholder:font-normal"
                                        />

                                        <Textarea
                                            placeholder="Add a description..."
                                            value={editingTask.description || ""}
                                            onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                            className="min-h-[70px] rounded-xl bg-secondary/20 border-border/30 resize-none text-sm"
                                            rows={2}
                                        />
                                    </div>

                                    {/* Priority, Status & Date Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Priority</label>
                                            <Select value={editingTask.priority} onValueChange={(val) => setEditingTask({ ...editingTask, priority: val as Task["priority"] })}>
                                                <SelectTrigger className="h-11 rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">🟢 Low</SelectItem>
                                                    <SelectItem value="medium">🟡 Medium</SelectItem>
                                                    <SelectItem value="high">🟠 High</SelectItem>
                                                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Status</label>
                                            <Select value={editingTask.status} onValueChange={(val) => setEditingTask({ ...editingTask, status: val as Task["status"] })}>
                                                <SelectTrigger className="h-11 rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="todo">📋 To Do</SelectItem>
                                                    <SelectItem value="in-progress">🔄 In Progress</SelectItem>
                                                    <SelectItem value="done">✅ Done</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Due Date</label>
                                            <DatePicker
                                                value={editingTask.due_date ? editingTask.due_date.split('T')[0] : ""}
                                                onChange={(date) => setEditingTask({ ...editingTask, due_date: date })}
                                                placeholder="Pick a date"
                                                className="h-11 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    {/* Module / Context */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground ml-1 flex items-center gap-1.5">
                                            <Folder className="w-3.5 h-3.5" /> Link to Module
                                        </label>
                                        <div className="flex gap-2">
                                            <Select value={editingTask.context_type || "general"} onValueChange={(val) => setEditingTask({ ...editingTask, context_type: val as Task["context_type"], context_id: "" })}>
                                                <SelectTrigger className="h-11 w-1/3 shrink-0 rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="general">General</SelectItem>
                                                    <SelectItem value="study">Study</SelectItem>
                                                    <SelectItem value="finance">Finance</SelectItem>
                                                    <SelectItem value="habit">Habit</SelectItem>
                                                    <SelectItem value="inventory">Inventory</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <div className="flex-1">
                                                {(!editingTask.context_type || editingTask.context_type === "general") ? (
                                                    <div className="h-11 flex items-center px-4 rounded-xl border border-dashed border-muted-foreground/20 text-muted-foreground text-sm bg-secondary/10 w-full">
                                                        No specific module linked
                                                    </div>
                                                ) : editingTask.context_type === "study" ? (
                                                    <Select value={editingTask.context_id || ""} onValueChange={(val) => setEditingTask({ ...editingTask, context_id: val })}>
                                                        <SelectTrigger className="h-11 w-full rounded-xl">
                                                            <SelectValue placeholder="Select chapter..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(chaptersBySubject).map(([subject, chs]) => (
                                                                <SelectGroup key={subject}>
                                                                    <SelectLabel>{subject}</SelectLabel>
                                                                    {chs.map(ch => <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>)}
                                                                </SelectGroup>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Select value={editingTask.context_id || ""} onValueChange={(val) => setEditingTask({ ...editingTask, context_id: val })}>
                                                        <SelectTrigger className="h-11 w-full rounded-xl">
                                                            <SelectValue placeholder="Select item..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {editingTask.context_type === "habit" && habits.map(h => (
                                                                <SelectItem key={h.id} value={h.id}>{h.habit_name}</SelectItem>
                                                            ))}
                                                            {editingTask.context_type === "inventory" && inventoryItems.map(i => (
                                                                <SelectItem key={i.id} value={i.id}>{i.item_name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Finance Section */}
                                    {editingTask.context_type === "finance" && (
                                        <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                <DollarSign className="w-3.5 h-3.5" /> Budget & Cost
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2 flex gap-2 mb-1">
                                                    <button
                                                        onClick={() => setEditingTask({ ...editingTask, finance_type: "expense" })}
                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${(editingTask.finance_type || "expense") === "expense" ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                                                    >
                                                        💸 Expense
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingTask({ ...editingTask, finance_type: "income" })}
                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${editingTask.finance_type === "income" ? "bg-green-500 text-white shadow-md shadow-green-500/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                                                    >
                                                        💰 Income
                                                    </button>
                                                </div>

                                                {(editingTask.finance_type || "expense") === "expense" && (
                                                    <div className="col-span-1">
                                                        <Select value={editingTask.budget_id || ""} onValueChange={(val) => setEditingTask({ ...editingTask, budget_id: val })}>
                                                            <SelectTrigger className="h-10 rounded-lg text-xs">
                                                                <SelectValue placeholder="Select budget..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {budgets.filter(b => b.type === "budget").map(b => (
                                                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                                <div className={`relative ${editingTask.finance_type === "income" ? "col-span-2" : "col-span-1"}`}>
                                                    <Input
                                                        type="number"
                                                        placeholder={editingTask.finance_type === "income" ? "Expected income" : "Expected cost"}
                                                        value={editingTask.expected_cost || ""}
                                                        onChange={(e) => setEditingTask({ ...editingTask, expected_cost: Number(e.target.value) || undefined })}
                                                        className="h-10 rounded-lg bg-background/50 pl-7 text-xs"
                                                    />
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">৳</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Time Section - Single Row */}
                                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> Time Block
                                        </label>
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1 space-y-1">
                                                <span className="text-[10px] text-muted-foreground ml-0.5">Start</span>
                                                <TimePicker
                                                    value={editingTask.start_time || ""}
                                                    onChange={(val) => setEditingTask({ ...editingTask, start_time: val || undefined })}
                                                    placeholder="Start"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <span className="text-[10px] text-muted-foreground ml-0.5">End</span>
                                                <TimePicker
                                                    value={editingTask.end_time || ""}
                                                    onChange={(val) => setEditingTask({ ...editingTask, end_time: val || undefined })}
                                                    placeholder="End"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1 relative">
                                                <span className="text-[10px] text-muted-foreground ml-0.5">Duration</span>
                                                <Input
                                                    type="number"
                                                    placeholder="—"
                                                    value={editingTask.estimated_duration || ""}
                                                    onChange={(e) => setEditingTask({ ...editingTask, estimated_duration: Number(e.target.value) || undefined })}
                                                    className="h-8 rounded-lg bg-background/50 text-xs pr-8"
                                                />
                                                <span className="absolute right-2 bottom-[5px] text-[10px] text-muted-foreground">min</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-secondary/30 border-t border-border/50">
                                <Button
                                    onClick={handleSaveEdit}
                                    className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:to-primary"
                                    disabled={updateTask.isPending}
                                >
                                    {updateTask.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </>
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
            {/* Import Study Dialog */}
            < Dialog open={importStudyOpen} onOpenChange={setImportStudyOpen} >
                <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Import from Study</DialogTitle>
                        <DialogDescription>Select a part to add as a task.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {/* Subject */}
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Subject</label>
                            <div className="relative">
                                <select
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={importSubjectId}
                                    onChange={(e) => {
                                        setImportSubjectId(e.target.value);
                                        setImportChapterId("");
                                    }}
                                >
                                    <option value="" disabled>Select Subject...</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Chapter */}
                        {importSubjectId && (
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Chapter</label>
                                <div className="relative">
                                    <select
                                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={importChapterId}
                                        onChange={(e) => setImportChapterId(e.target.value)}
                                    >
                                        <option value="" disabled>Select Chapter...</option>
                                        {(studyChaptersBySubject[importSubjectId] || []).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Parts List */}
                        {importChapterId && (
                            <div className="space-y-2 mt-2">
                                <label className="text-xs text-muted-foreground">Select a Part</label>
                                <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-1">
                                    {(partsByChapter[importChapterId] || []).length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-2 text-center">No parts found.</p>
                                    ) : (
                                        (partsByChapter[importChapterId] || []).filter(p => !p.parent_id).map(part => (
                                            <StudyPartSelectItem
                                                key={part.id}
                                                part={part}
                                                allParts={partsByChapter[importChapterId] || []}
                                                onSelect={(p) => {
                                                    setNewTask({
                                                        ...defaultNewTask,
                                                        title: p.name,
                                                        context_type: "study",
                                                        context_id: importChapterId, // Link to chapter for context
                                                        estimated_duration: String(p.estimated_minutes),
                                                        start_time: p.scheduled_time || "",
                                                        due_date: p.scheduled_date ? new Date(p.scheduled_date).toISOString() : "",
                                                    });
                                                    setImportStudyOpen(false);
                                                    setImportSubjectId("");
                                                    setImportChapterId("");
                                                    setIsDialogOpen(true);
                                                }}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog >
        </AppLayout >
    );
}

function StudyPartSelectItem({
    part,
    allParts,
    level = 0,
    onSelect
}: {
    part: { id: string; name: string; estimated_minutes: number; scheduled_time?: string; scheduled_date?: string; parent_id?: string | null };
    allParts: any[];
    level?: number;
    onSelect: (part: any) => void;
}) {
    const children = allParts.filter(p => p.parent_id === part.id);

    return (
        <>
            <button
                className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-secondary/50 flex items-center justify-between group transition-colors"
                style={{ paddingLeft: `${Math.max(0.75, level * 1 + 0.75)}rem` }}
                onClick={() => onSelect(part)}
            >
                <div className="flex items-center gap-2">
                    {level > 0 && <div className="w-1.5 h-1.5 rounded-full bg-border" />}
                    <span>{part.name}</span>
                </div>
                <div className="flex items-center gap-2 opacity-60 text-xs">
                    <span>{part.estimated_minutes}m</span>
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>
            </button>
            {children.map(child => (
                <StudyPartSelectItem
                    key={child.id}
                    part={child}
                    allParts={allParts}
                    level={level + 1}
                    onSelect={onSelect}
                />
            ))}
        </>
    );
}

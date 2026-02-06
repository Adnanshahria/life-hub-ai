import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2, ChevronLeft, ChevronRight, Clock, X, Calendar as CalendarIcon, Pencil } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance, FinanceEntry } from "@/hooks/useFinance";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";

const CATEGORIES = ["Food", "Transport", "Entertainment", "Bills", "Shopping", "Freelance", "Salary", "Other"];
const COLORS = ["#EF4444", "#F87171", "#DC2626", "#FB7185", "#E11D48", "#F43F5E", "#BE123C", "#9F1239"];

export default function FinancePage() {
    const { entries, isLoading, addEntry, deleteEntry, updateEntry } = useFinance();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyType, setHistoryType] = useState<"all" | "income" | "expense">("all");

    // View mode: daily, weekly, monthly, yearly, custom, all
    type ViewMode = "daily" | "weekly" | "monthly" | "yearly" | "custom" | "all";
    const [viewMode, setViewMode] = useState<ViewMode>("daily");

    // Date states
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split("T")[0]);

    // Edit state
    const [editingEntry, setEditingEntry] = useState<{
        id: string;
        type: "income" | "expense";
        amount: string;
        category: string;
        description: string;
        date: string;
    } | null>(null);

    const [newEntry, setNewEntry] = useState<{
        type: "income" | "expense";
        amount: string;
        category: string;
        description: string;
        date: string;
    }>({
        type: "expense",
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
    });

    // Helper to get local date string from Date object
    const getLocalDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Calculate date range based on view mode
    const getDateRange = () => {
        const today = new Date();
        const selected = new Date(selectedDate + "T12:00:00");

        switch (viewMode) {
            case "daily":
                return { start: selectedDate, end: selectedDate };
            case "weekly": {
                const dayOfWeek = selected.getDay();
                // Start week on Saturday (6), end on Friday (5)
                const daysFromSaturday = (dayOfWeek + 1) % 7;
                const weekStart = new Date(selected);
                weekStart.setDate(selected.getDate() - daysFromSaturday);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return { start: getLocalDateStr(weekStart), end: getLocalDateStr(weekEnd) };
            }
            case "monthly": {
                const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
                const monthEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
                return { start: getLocalDateStr(monthStart), end: getLocalDateStr(monthEnd) };
            }
            case "yearly": {
                const yearStart = new Date(selected.getFullYear(), 0, 1);
                const yearEnd = new Date(selected.getFullYear(), 11, 31);
                return { start: getLocalDateStr(yearStart), end: getLocalDateStr(yearEnd) };
            }
            case "custom":
                return { start: customStartDate, end: customEndDate };
            case "all":
                return { start: "1970-01-01", end: "2099-12-31" };
            default:
                return { start: selectedDate, end: selectedDate };
        }
    };

    // Filter entries by date range
    const filteredEntries = useMemo(() => {
        const range = getDateRange();
        return entries.filter(e => {
            if (!e.date) return false;
            const entryDate = new Date(e.date);
            const localDateStr = getLocalDateStr(entryDate);
            return localDateStr >= range.start && localDateStr <= range.end;
        });
    }, [entries, selectedDate, viewMode, customStartDate, customEndDate]);

    // Calculate stats for filtered entries
    const expenses = filteredEntries.filter((e) => e.type === "expense");
    const incomes = filteredEntries.filter((e) => e.type === "income");
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalIncome - totalExpenses;

    const expensesByCategory = expenses.reduce(
        (acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        },
        {} as Record<string, number>
    );

    const incomesByCategory = incomes.reduce(
        (acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        },
        {} as Record<string, number>
    );

    // Colors for income (green shades) and expenses (red shades)
    const INCOME_COLORS = ["#10B981", "#34D399", "#059669", "#6EE7B7", "#047857", "#A7F3D0"];
    const EXPENSE_COLORS = ["#EF4444", "#F87171", "#DC2626", "#FB7185", "#E11D48", "#F43F5E"];

    const chartData = [
        ...Object.entries(incomesByCategory).map(([name, value], i) => ({
            name: `${name} (Income)`,
            value,
            color: INCOME_COLORS[i % INCOME_COLORS.length],
        })),
        ...Object.entries(expensesByCategory).map(([name, value], i) => ({
            name: `${name} (Expense)`,
            value,
            color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
        })),
    ];

    const handleAddEntry = async () => {
        if (!newEntry.amount || !newEntry.category) return;
        await addEntry.mutateAsync({
            type: newEntry.type,
            amount: parseFloat(newEntry.amount),
            category: newEntry.category,
            description: newEntry.description,
            date: newEntry.date,
        });
        setNewEntry({
            type: "expense",
            amount: "",
            category: "",
            description: "",
            date: new Date().toISOString().split("T")[0]
        });
        setIsDialogOpen(false);
    };

    // Calculate trend data for chart/grid (daily breakdown for weekly/monthly, grouped for yearly/all/custom)
    const trendData = useMemo(() => {
        const data: { day: string; income: number; expense: number }[] = [];

        if (viewMode === "daily") {
            // No trendData needed for daily view (uses pie chart)
            return data;
        }

        if (viewMode === "weekly" || viewMode === "monthly") {
            // Daily breakdown for weekly/monthly
            const range = getDateRange();
            const start = new Date(range.start + "T00:00:00");
            const end = new Date(range.end + "T23:59:59");

            const current = new Date(start);
            while (current <= end) {
                const dateStr = getLocalDateStr(current);
                const dayEntries = filteredEntries.filter(e => getLocalDateStr(new Date(e.date)) === dateStr);

                const dayIncome = dayEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
                const dayExpense = dayEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);

                const label = viewMode === "weekly"
                    ? format(current, "EEE")  // Sat, Sun, Mon...
                    : current.getDate().toString();  // 1, 2, 3...31

                data.push({ day: label, income: dayIncome, expense: dayExpense });
                current.setDate(current.getDate() + 1);
            }
        } else {
            // Group by month for yearly/all/custom (from actual entries, not date iteration)
            const monthlyData: { [key: string]: { income: number; expense: number } } = {};

            filteredEntries.forEach(entry => {
                const date = new Date(entry.date);
                const monthKey = format(date, "yyyy-MM");
                const monthLabel = format(date, "MMM yyyy");

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { income: 0, expense: 0 };
                }

                if (entry.type === "income") {
                    monthlyData[monthKey].income += entry.amount;
                } else {
                    monthlyData[monthKey].expense += entry.amount;
                }
            });

            // Convert to array and sort by date
            Object.keys(monthlyData).sort().forEach(key => {
                const date = new Date(key + "-01");
                data.push({
                    day: format(date, "MMM yyyy"),
                    income: monthlyData[key].income,
                    expense: monthlyData[key].expense,
                });
            });
        }

        return data;
    }, [filteredEntries, viewMode, getDateRange, getLocalDateStr]);

    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split("T")[0]);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 86400000);
        const yesterday = new Date(today.getTime() - 86400000);

        const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (target.getTime() === today.getTime()) return "Today";
        if (target.getTime() === yesterday.getTime()) return "Yesterday";
        if (target.getTime() === tomorrow.getTime()) return "Tomorrow";
        return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    };

    const openHistory = (type: "all" | "income" | "expense") => {
        setHistoryType(type);
        setIsHistoryOpen(true);
    };

    // Get all entries for history view
    const historyEntries = useMemo(() => {
        let filtered = entries;
        if (historyType === "income") filtered = entries.filter(e => e.type === "income");
        if (historyType === "expense") filtered = entries.filter(e => e.type === "expense");
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [entries, historyType]);

    return (
        <AppLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex flex-col gap-4">
                    {/* Row 1: Title + View Mode Tabs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="hidden md:block">
                            <h1 className="text-3xl font-bold">Finance</h1>
                            <p className="text-muted-foreground">Track your income and expenses</p>
                        </div>

                        {/* View Mode Selector */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-1 p-1 bg-secondary rounded-lg w-fit mx-auto md:mx-0">
                            {(["daily", "weekly", "monthly", "yearly", "custom", "all"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-all capitalize ${viewMode === mode
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "hover:bg-secondary-foreground/10"
                                        }`}
                                >
                                    {mode === "all" ? "All Time" : mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Row 2: Date Controls + Add Entry Button */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Date Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                            {viewMode === "daily" && (
                                <>
                                    <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="gap-2 font-medium">
                                                <CalendarIcon className="w-4 h-4" />
                                                {format(new Date(selectedDate + "T12:00:00"), "MMM d, yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={new Date(selectedDate + "T12:00:00")}
                                                onSelect={(date) => date && setSelectedDate(getLocalDateStr(date))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}>
                                        Today
                                    </Button>
                                </>
                            )}
                            {viewMode === "weekly" && (
                                <>
                                    <Button variant="outline" size="icon" onClick={() => changeDate(-7)}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <div className="px-4 py-2 bg-secondary rounded-lg text-sm font-medium">
                                        {(() => {
                                            const range = getDateRange();
                                            const start = new Date(range.start + "T12:00:00");
                                            const end = new Date(range.end + "T12:00:00");
                                            return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
                                        })()}
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => changeDate(7)}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}>
                                        This Week
                                    </Button>
                                </>
                            )}
                            {viewMode === "monthly" && (
                                <>
                                    <Button variant="outline" size="icon" onClick={() => {
                                        const d = new Date(selectedDate + "T12:00:00");
                                        d.setMonth(d.getMonth() - 1);
                                        setSelectedDate(getLocalDateStr(d));
                                    }}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="gap-2 font-medium">
                                                <CalendarIcon className="w-4 h-4" />
                                                {format(new Date(selectedDate + "T12:00:00"), "MMMM yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={new Date(selectedDate + "T12:00:00")}
                                                onSelect={(date) => date && setSelectedDate(getLocalDateStr(date))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="outline" size="icon" onClick={() => {
                                        const d = new Date(selectedDate + "T12:00:00");
                                        d.setMonth(d.getMonth() + 1);
                                        setSelectedDate(getLocalDateStr(d));
                                    }}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}>
                                        This Month
                                    </Button>
                                </>
                            )}
                            {viewMode === "yearly" && (
                                <>
                                    <Button variant="outline" size="icon" onClick={() => {
                                        const d = new Date(selectedDate + "T12:00:00");
                                        d.setFullYear(d.getFullYear() - 1);
                                        setSelectedDate(getLocalDateStr(d));
                                    }}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Select value={selectedDate.substring(0, 4)} onValueChange={(v) => setSelectedDate(v + "-01-01")}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon" onClick={() => {
                                        const d = new Date(selectedDate + "T12:00:00");
                                        d.setFullYear(d.getFullYear() + 1);
                                        setSelectedDate(getLocalDateStr(d));
                                    }}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}>
                                        This Year
                                    </Button>
                                </>
                            )}
                            {viewMode === "custom" && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm text-muted-foreground">From:</span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <CalendarIcon className="w-4 h-4" />
                                                {format(new Date(customStartDate + "T12:00:00"), "MMM d, yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={new Date(customStartDate + "T12:00:00")}
                                                onSelect={(date) => date && setCustomStartDate(getLocalDateStr(date))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <span className="text-sm text-muted-foreground">To:</span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <CalendarIcon className="w-4 h-4" />
                                                {format(new Date(customEndDate + "T12:00:00"), "MMM d, yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={new Date(customEndDate + "T12:00:00")}
                                                onSelect={(date) => date && setCustomEndDate(getLocalDateStr(date))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
                        </div>

                        {/* Add Entry Button */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Entry
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Finance Entry</DialogTitle>
                                    <DialogDescription>
                                        Create a new income or expense entry.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <Tabs value={newEntry.type} onValueChange={(v) => setNewEntry({ ...newEntry, type: v as "income" | "expense" })}>
                                        <TabsList className="w-full">
                                            <TabsTrigger
                                                value="expense"
                                                className="flex-1 data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all"
                                            >
                                                Expense
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="income"
                                                className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white transition-all"
                                            >
                                                Income
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>

                                    {/* Date Picker for Entry */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start gap-2">
                                                <CalendarIcon className="w-4 h-4" />
                                                {format(new Date(newEntry.date + "T12:00:00"), "MMM d, yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={new Date(newEntry.date + "T12:00:00")}
                                                onSelect={(date) => date && setNewEntry({ ...newEntry, date: getLocalDateStr(date) })}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    <Input
                                        type="number"
                                        placeholder="Amount (৳)"
                                        value={newEntry.amount}
                                        onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                                    />
                                    <Select
                                        value={newEntry.category}
                                        onValueChange={(v) => setNewEntry({ ...newEntry, category: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Description (optional)"
                                        value={newEntry.description}
                                        onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                    />
                                    <Button onClick={handleAddEntry} className="w-full" disabled={addEntry.isPending}>
                                        {addEntry.isPending ? "Adding..." : `Add ${newEntry.type}`}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Stats Cards - Now Clickable */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-5 cursor-pointer hover:ring-2 hover:ring-green-400/50 transition-all"
                        onClick={() => openHistory("income")}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-muted-foreground">Total Income</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">৳{totalIncome.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Click to view history</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-5 cursor-pointer hover:ring-2 hover:ring-red-400/50 transition-all"
                        onClick={() => openHistory("expense")}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-red-500/20">
                                <TrendingDown className="w-5 h-5 text-red-400" />
                            </div>
                            <span className="text-muted-foreground">Total Expenses</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400">৳{totalExpenses.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Click to view history</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-5 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                        onClick={() => openHistory("all")}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/20">
                                <Wallet className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-muted-foreground">Balance</span>
                        </div>
                        <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                            ৳{balance.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Click to view all</p>
                    </motion.div>
                </div>

                {/* Chart & List */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Chart - Pie for daily, Bar for others */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-5"
                    >
                        <h3 className="font-semibold mb-4">
                            {viewMode === "daily" ? "Transactions by Category" : "Income vs Expenses"}
                        </h3>
                        {viewMode === "daily" ? (
                            // Pie Chart for daily view
                            chartData.length > 0 ? (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                dataKey="value"
                                                label={({ name, value }) => `${name}: ৳${value}`}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `৳${value}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-muted-foreground">
                                    No expense data for {formatDate(selectedDate)}
                                </div>
                            )
                        ) : (viewMode === "weekly" || viewMode === "monthly") ? (
                            // Line Chart for weekly/monthly views - showing daily trends
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={trendData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                                        <YAxis stroke="#9CA3AF" tickFormatter={(v) => `৳${v}`} fontSize={12} />
                                        <Tooltip
                                            formatter={(value) => `৳${Number(value).toLocaleString()}`}
                                            contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px" }}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="income"
                                            name="Income"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            dot={{ fill: "#10B981", strokeWidth: 2, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="expense"
                                            name="Expense"
                                            stroke="#EF4444"
                                            strokeWidth={2}
                                            dot={{ fill: "#EF4444", strokeWidth: 2, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            // Grid table for yearly/custom/all views
                            <div className="h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-background">
                                        <tr className="border-b border-border">
                                            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Period</th>
                                            <th className="text-right py-2 px-2 font-medium text-green-400">Income</th>
                                            <th className="text-right py-2 px-2 font-medium text-red-400">Expense</th>
                                            <th className="text-right py-2 px-2 font-medium text-muted-foreground">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trendData.map((row, i) => (
                                            <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                                                <td className="py-2 px-2 font-medium">{row.day}</td>
                                                <td className="text-right py-2 px-2 text-green-400">৳{row.income.toLocaleString()}</td>
                                                <td className="text-right py-2 px-2 text-red-400">৳{row.expense.toLocaleString()}</td>
                                                <td className={`text-right py-2 px-2 font-medium ${row.income - row.expense >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                    {row.income - row.expense >= 0 ? "+" : ""}৳{(row.income - row.expense).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {trendData.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-8 text-muted-foreground">No data for this period</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 bg-secondary/50 font-semibold">
                                        <tr>
                                            <td className="py-2 px-2">Total</td>
                                            <td className="text-right py-2 px-2 text-green-400">৳{totalIncome.toLocaleString()}</td>
                                            <td className="text-right py-2 px-2 text-red-400">৳{totalExpenses.toLocaleString()}</td>
                                            <td className={`text-right py-2 px-2 ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                {balance >= 0 ? "+" : ""}৳{balance.toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </motion.div>

                    {/* Recent Transactions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-5"
                    >
                        <h3 className="font-semibold mb-4">
                            {viewMode === "daily"
                                ? `Transactions for ${formatDate(selectedDate)}`
                                : viewMode === "all"
                                    ? "All Transactions"
                                    : `Transactions (${filteredEntries.length})`
                            }
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {isLoading ? (
                                <p className="text-muted-foreground">Loading...</p>
                            ) : filteredEntries.length === 0 ? (
                                <p className="text-muted-foreground">No transactions for this date</p>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-full ${entry.type === "income" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                                                {entry.type === "income" ? (
                                                    <TrendingUp className="w-3 h-3 text-green-400" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{entry.category}</p>
                                                {entry.description && (
                                                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${entry.type === "income" ? "text-green-400" : "text-red-400"}`}>
                                                {entry.type === "income" ? "+" : "-"}৳{entry.amount}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => deleteEntry.mutate(entry.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* History Modal */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setIsHistoryOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <h2 className="text-xl font-bold">
                                        {historyType === "all" ? "All Transactions" : historyType === "income" ? "Income History" : "Expense History"}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="p-4 overflow-y-scroll max-h-[60vh] space-y-2">
                                {historyEntries.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No transactions found</p>
                                ) : (
                                    historyEntries.map((entry) => (
                                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${entry.type === "income" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                                                    {entry.type === "income" ? (
                                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{entry.category}</p>
                                                    {entry.description && (
                                                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        {(() => {
                                                            const d = new Date(entry.date);
                                                            return d.toLocaleDateString(undefined, {
                                                                weekday: "short",
                                                                month: "short",
                                                                day: "numeric",
                                                                year: "numeric"
                                                            });
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-lg font-bold ${entry.type === "income" ? "text-green-400" : "text-red-400"}`}>
                                                    {entry.type === "income" ? "+" : "-"}৳{entry.amount.toLocaleString()}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setEditingEntry({
                                                        id: entry.id,
                                                        type: entry.type,
                                                        amount: entry.amount.toString(),
                                                        category: entry.category,
                                                        description: entry.description || "",
                                                        date: getLocalDateStr(new Date(entry.date)),
                                                    })}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-400 hover:text-red-500"
                                                    onClick={() => deleteEntry.mutate(entry.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Entry Dialog */}
            <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Entry</DialogTitle>
                        <DialogDescription>
                            Update this {editingEntry?.type} entry.
                        </DialogDescription>
                    </DialogHeader>
                    {editingEntry && (
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Amount</label>
                                    <Input
                                        type="number"
                                        value={editingEntry.amount}
                                        onChange={(e) => setEditingEntry({ ...editingEntry, amount: e.target.value })}
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <Select
                                        value={editingEntry.category}
                                        onValueChange={(value) => setEditingEntry({ ...editingEntry, category: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Input
                                    value={editingEntry.description}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start gap-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            {format(new Date(editingEntry.date + "T12:00:00"), "MMM d, yyyy")}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={new Date(editingEntry.date + "T12:00:00")}
                                            onSelect={(date) => date && setEditingEntry({ ...editingEntry, date: getLocalDateStr(date) })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setEditingEntry(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        updateEntry.mutate({
                                            id: editingEntry.id,
                                            amount: Number(editingEntry.amount),
                                            category: editingEntry.category,
                                            description: editingEntry.description,
                                            date: editingEntry.date,
                                        });
                                        setEditingEntry(null);
                                    }}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout >
    );
}

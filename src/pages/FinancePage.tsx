import { useState, useMemo } from "react";
import { SEO } from "@/components/seo/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2, ChevronLeft, ChevronRight, Clock, X, Calendar as CalendarIcon, Pencil, PiggyBank, Target, Download, Star, ChevronDown } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useFinance, FinanceEntry } from "@/hooks/useFinance";
import { useBudget, SavingsTransaction } from "@/hooks/useBudget";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CATEGORIES = ["Food", "Transport", "Entertainment", "Bills", "Shopping", "Freelance", "Salary", "Other"];
const COLORS = ["#EF4444", "#F87171", "#DC2626", "#FB7185", "#E11D48", "#F43F5E", "#BE123C", "#9F1239"];

export default function FinancePage() {
    const { entries, regularEntries, specialEntries, isLoading, addEntry, deleteEntry, updateEntry, totalSpecialIncome, totalSpecialExpenses, specialBalance } = useFinance();
    const { budgets, savingsGoals, budgetGoals, totalSavings, budgetRemaining, primaryBudget, getBudgetRemaining, addBudget, updateBudget, addToSavings, deleteBudget, savingsTransactions, deleteSavingsTransaction, updateSavingsTransaction, specialSavingsGoals, specialBudgetGoals, totalSpecialSavings } = useBudget();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSavingsHistoryOpen, setIsSavingsHistoryOpen] = useState(false);
    const [historyType, setHistoryType] = useState<"all" | "income" | "expense">("all");
    const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
    // Finance view mode: 'default' or 'special'
    const [financeViewMode, setFinanceViewMode] = useState<"default" | "special">("default");
    // In special view: whether to also count special entries in default budget
    const [countInDefault, setCountInDefault] = useState(false);
    const [editingGoal, setEditingGoal] = useState<{ id: string; name: string; target_amount: number; type: "budget" | "savings"; period?: string } | null>(null);
    const [newBudget, setNewBudget] = useState<{
        name: string;
        type: "budget" | "savings";
        target_amount: string;
        period: "monthly" | "weekly" | "yearly" | null;
        category: string;
        start_month: number;
        start_year: number;
    }>({
        name: "",
        type: "budget",
        target_amount: "",
        period: "monthly",
        category: "",
        start_month: new Date().getMonth() + 1,
        start_year: new Date().getFullYear(),
    });
    const [savingsAmount, setSavingsAmount] = useState<string>("");
    const [goalsSortBy, setGoalsSortBy] = useState<"date" | "amount">("date");

    // Helper to get local date string from Date object (MUST be defined before useState calls)
    const getLocalDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // View mode: daily, weekly, monthly, yearly, custom, all
    type ViewMode = "daily" | "weekly" | "monthly" | "yearly" | "custom" | "all";
    const [viewMode, setViewMode] = useState<ViewMode>("daily");

    // Date states - use local date, not UTC
    const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr(new Date()));
    const [customStartDate, setCustomStartDate] = useState(() => getLocalDateStr(new Date()));
    const [customEndDate, setCustomEndDate] = useState(() => getLocalDateStr(new Date()));

    // Edit state
    const [editingEntry, setEditingEntry] = useState<{
        id: string;
        type: "income" | "expense";
        amount: string;
        category: string;
        description: string;
        date: string;
    } | null>(null);
    const [editingSavingsTransaction, setEditingSavingsTransaction] = useState<SavingsTransaction | null>(null);

    const [newEntry, setNewEntry] = useState<{
        type: "income" | "expense";
        amount: string;
        category: string;
        description: string;
        date: string;
        source: string; // "budget" or savings ID
        is_special: boolean;
    }>(() => ({
        type: "expense",
        amount: "",
        category: "",
        description: "",
        date: getLocalDateStr(new Date()),
        source: "budget",
        is_special: false,
    }));

    // Note: getLocalDateStr is defined above useState calls

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

    // Filter entries by date range based on current view mode
    const filteredEntries = useMemo(() => {
        const range = getDateRange();
        // In default mode, show regular entries; in special mode, show special entries
        const entriesToFilter = financeViewMode === "default" ? regularEntries : specialEntries;
        return entriesToFilter.filter(e => {
            if (!e.date) return false;
            const entryDate = new Date(e.date);
            const localDateStr = getLocalDateStr(entryDate);
            return localDateStr >= range.start && localDateStr <= range.end;
        });
    }, [regularEntries, specialEntries, financeViewMode, selectedDate, viewMode, customStartDate, customEndDate]);

    // Calculate stats for filtered entries
    const expenses = filteredEntries.filter((e) => e.type === "expense");
    const incomes = filteredEntries.filter((e) => e.type === "income");
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0);
    // Balance = Income - Expenses (not subtracting savings, as savings are tracked separately)
    const balance = totalIncome - totalExpenses;

    const EXPENSE_CATEGORIES = ["Food", "Transport", "Rent", "Bills", "Shopping", "Entertainment", "Health", "Education", "Other"];
    const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Gift", "Investment", "Other"];

    const [customCategory, setCustomCategory] = useState("");

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

        // Add the finance entry - is_special based on current view mode
        await addEntry.mutateAsync({
            type: newEntry.type,
            amount: parseFloat(newEntry.amount),
            category: newEntry.category,
            description: newEntry.description,
            date: newEntry.date,
            is_special: financeViewMode === "special",
        });

        // If expense is from a savings goal, deduct from it
        if (newEntry.type === "expense" && newEntry.source && newEntry.source !== "budget") {
            const savings = savingsGoals?.find(s => s.id === newEntry.source);
            if (savings) {
                // Deduct by adding negative amount (or use a separate mutation if available)
                await addToSavings.mutateAsync({
                    id: newEntry.source,
                    amount: -parseFloat(newEntry.amount) // Negative to deduct
                });
            }
        }

        // If income is going to a savings goal, add to it
        if (newEntry.type === "income" && newEntry.source && newEntry.source !== "budget") {
            const savings = savingsGoals?.find(s => s.id === newEntry.source);
            if (savings) {
                await addToSavings.mutateAsync({
                    id: newEntry.source,
                    amount: parseFloat(newEntry.amount) // Positive to add
                });
            }
        }

        setNewEntry({
            type: "expense",
            amount: "",
            category: "",
            description: "",
            date: getLocalDateStr(new Date()),
            source: "budget",
            is_special: false,
        });
        setIsDialogOpen(false);
    };

    // PDF Export function
    const generatePDF = (title: string, data: FinanceEntry[] | SavingsTransaction[], type: "finance" | "savings") => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(79, 70, 229); // Primary color
        doc.text(title, pageWidth / 2, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${format(new Date(), "PPP p")}`, pageWidth / 2, 28, { align: "center" });

        if (type === "finance") {
            const financeData = data as FinanceEntry[];
            const tableData = financeData.map(entry => [
                format(new Date(entry.date), "MMM dd, yyyy"),
                entry.type.charAt(0).toUpperCase() + entry.type.slice(1),
                entry.category,
                entry.description || "-",
                `${entry.type === "income" ? "+" : "-"}৳${entry.amount.toLocaleString()}`,
                entry.is_special ? "Yes" : "No"
            ]);

            const totalIncome = financeData.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
            const totalExpense = financeData.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);

            autoTable(doc, {
                startY: 35,
                head: [["Date", "Type", "Category", "Description", "Amount", "Special"]],
                body: tableData,
                foot: [["", "", "", "Total Income:", `+৳${totalIncome.toLocaleString()}`, ""], ["", "", "", "Total Expense:", `-৳${totalExpense.toLocaleString()}`, ""], ["", "", "", "Balance:", `৳${(totalIncome - totalExpense).toLocaleString()}`, ""]],
                theme: "striped",
                headStyles: { fillColor: [79, 70, 229] },
                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
            });
        } else {
            const savingsData = data as SavingsTransaction[];
            const tableData = savingsData.map(tx => [
                format(new Date(tx.date), "MMM dd, yyyy"),
                tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
                tx.description || "-",
                `${tx.type === "deposit" ? "+" : "-"}৳${tx.amount.toLocaleString()}`
            ]);

            const totalDeposits = savingsData.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
            const totalWithdrawals = savingsData.filter(t => t.type === "withdraw").reduce((s, t) => s + t.amount, 0);

            autoTable(doc, {
                startY: 35,
                head: [["Date", "Type", "Description", "Amount"]],
                body: tableData,
                foot: [["", "", "Total Deposits:", `+৳${totalDeposits.toLocaleString()}`], ["", "", "Total Withdrawals:", `-৳${totalWithdrawals.toLocaleString()}`], ["", "", "Net:", `৳${(totalDeposits - totalWithdrawals).toLocaleString()}`]],
                theme: "striped",
                headStyles: { fillColor: [147, 51, 234] },
                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
            });
        }

        doc.save(`${title.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
        setSelectedDate(getLocalDateStr(d));
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
            <SEO title="Finance" description="Track your income, expenses, and budget." />
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

                        {/* Default / Special Toggle */}
                        <div className="flex items-center gap-4 mx-auto md:mx-0">
                            <div className="flex p-1 bg-secondary rounded-lg">
                                <button
                                    onClick={() => setFinanceViewMode("default")}
                                    className={`px-4 py-1.5 text-sm rounded-md transition-all flex items-center gap-2 ${financeViewMode === "default"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "hover:bg-secondary-foreground/10"
                                        }`}
                                >
                                    <Wallet className="w-4 h-4" />
                                    Default
                                </button>
                                <button
                                    onClick={() => setFinanceViewMode("special")}
                                    className={`px-4 py-1.5 text-sm rounded-md transition-all flex items-center gap-2 ${financeViewMode === "special"
                                        ? "bg-yellow-500 text-black shadow-sm"
                                        : "hover:bg-secondary-foreground/10"
                                        }`}
                                >
                                    <Star className="w-4 h-4" />
                                    Special
                                </button>
                            </div>
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
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(getLocalDateStr(new Date()))}>
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
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(getLocalDateStr(new Date()))}>
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
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(getLocalDateStr(new Date()))}>
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
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(getLocalDateStr(new Date()))}>
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
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Category</p>
                                        <div className="flex gap-2">
                                            <Select
                                                value={(newEntry.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(newEntry.category) ? newEntry.category : (newEntry.category ? "Other" : "")}
                                                onValueChange={(v) => {
                                                    if (v === "Other") {
                                                        setNewEntry({ ...newEntry, category: "" });
                                                        setCustomCategory("");
                                                    } else {
                                                        setNewEntry({ ...newEntry, category: v });
                                                        setCustomCategory("");
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(newEntry.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                                    ))}
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* Show input if "Other" is selected (implied by category not being in list or being explicitly empty while "Other" logic is active, but simpler: if category is not in list) */}
                                        {(!(newEntry.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(newEntry.category) && newEntry.category !== "") || (newEntry.category === "" && customCategory !== undefined) ? (
                                            <Input
                                                placeholder="Enter custom category"
                                                value={newEntry.category}
                                                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                                                autoFocus
                                            />
                                        ) : null}
                                    </div>
                                    <Input
                                        placeholder="Description (optional)"
                                        value={newEntry.description}
                                        onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                    />

                                    {/* Source selector for expenses - shows current mode's savings */}
                                    {newEntry.type === "expense" && (
                                        (financeViewMode === "default" ? savingsGoals?.length > 0 : specialSavingsGoals?.length > 0)
                                    ) && (
                                            <Select
                                                value={newEntry.source}
                                                onValueChange={(v) => setNewEntry({ ...newEntry, source: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Deduct from..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="budget">
                                                        {financeViewMode === "special" ? "⭐ Special Budget" : "Budget"}
                                                    </SelectItem>
                                                    {(financeViewMode === "default" ? savingsGoals : specialSavingsGoals)?.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {financeViewMode === "special" ? "⭐ " : ""}{s.name} (৳{s.current_amount.toLocaleString()})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                    {/* Savings destination for income - shows current mode's savings */}
                                    {newEntry.type === "income" && (
                                        (financeViewMode === "default" ? savingsGoals?.length > 0 : specialSavingsGoals?.length > 0)
                                    ) && (
                                            <Select
                                                value={newEntry.source}
                                                onValueChange={(v) => setNewEntry({ ...newEntry, source: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Add to savings..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="budget">Don't add to savings</SelectItem>
                                                    {(financeViewMode === "default" ? savingsGoals : specialSavingsGoals)?.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {financeViewMode === "special" ? "⭐ " : ""}Add to {s.name} (৳{s.current_amount.toLocaleString()})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                    {/* View Mode Indicator */}
                                    <div className={`flex items-center justify-between p-3 rounded-lg ${financeViewMode === "special"
                                        ? "bg-yellow-500/20 border border-yellow-500/30"
                                        : "bg-primary/10 border border-primary/20"
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            {financeViewMode === "special" ? (
                                                <Star className="w-4 h-4 text-yellow-500" />
                                            ) : (
                                                <Wallet className="w-4 h-4 text-primary" />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Adding to {financeViewMode === "special" ? "Special" : "Default"} Finance
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {financeViewMode === "special"
                                                        ? "This will be tracked separately from regular finances"
                                                        : "Regular day-to-day transaction"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button onClick={handleAddEntry} className="w-full" disabled={addEntry.isPending}>
                                        {addEntry.isPending ? "Adding..." : `Add ${newEntry.type}`}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Stats Cards - Now Clickable */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-3 sm:p-5 cursor-pointer hover:ring-2 hover:ring-green-400/50 transition-all"
                        onClick={() => openHistory("income")}
                    >
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                            </div>
                            <span className="text-muted-foreground text-xs sm:text-sm">Income</span>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-green-400">৳{totalIncome.toLocaleString()}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden xs:block">Click to view</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-3 sm:p-5 cursor-pointer hover:ring-2 hover:ring-red-400/50 transition-all"
                        onClick={() => openHistory("expense")}
                    >
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/20">
                                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                            </div>
                            <span className="text-muted-foreground text-xs sm:text-sm">Expenses</span>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-red-400">৳{totalExpenses.toLocaleString()}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden xs:block">Click to view</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-3 sm:p-5 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all col-span-2 sm:col-span-1"
                        onClick={() => openHistory("all")}
                    >
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20">
                                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <span className="text-muted-foreground text-xs sm:text-sm">Balance</span>
                        </div>
                        <p className={`text-lg sm:text-2xl font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                            ৳{balance.toLocaleString()}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden xs:block">Click to view all</p>
                    </motion.div>
                </div>


                {/* Budget & Savings Section */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    {/* Budget Remaining Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-3 sm:p-5"
                    >
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20">
                                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                            </div>
                            <span className="text-muted-foreground text-xs sm:text-sm">Budget Left</span>
                        </div>
                        <p className={`text-lg sm:text-2xl font-bold ${budgetRemaining >= 0 ? "text-blue-400" : "text-red-400"}`}>
                            ৳{budgetRemaining.toLocaleString()}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                            {primaryBudget ? `${primaryBudget.name}` : "No budget"}
                        </p>
                    </motion.div>

                    {/* Total Savings Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="glass-card p-3 sm:p-5 cursor-pointer hover:ring-2 hover:ring-purple-400/50 transition-all"
                        onClick={() => setIsSavingsHistoryOpen(true)}
                    >
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20">
                                <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                            </div>
                            <span className="text-muted-foreground text-xs sm:text-sm">Savings</span>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-purple-400">৳{totalSavings.toLocaleString()}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden xs:block">View history</p>
                    </motion.div>

                    {/* Add Budget/Savings Button */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="glass-card p-3 sm:p-5 col-span-2"
                    >
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="min-w-0">
                                <h4 className="font-semibold text-sm sm:text-base">Goals</h4>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">{budgetGoals.length} budget, {savingsGoals.length} savings</p>
                            </div>
                            <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-1 sm:gap-2 h-7 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm">
                                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">Add</span> Goal
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Budget or Savings Goal</DialogTitle>
                                        <DialogDescription>
                                            Set a spending budget or savings target.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <Tabs value={newBudget.type} onValueChange={(v) => setNewBudget({ ...newBudget, type: v as "budget" | "savings" })}>
                                            <TabsList className="w-full">
                                                <TabsTrigger
                                                    value="budget"
                                                    className="flex-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all"
                                                >
                                                    Budget
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value="savings"
                                                    className="flex-1 data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all"
                                                >
                                                    Savings
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>

                                        <Input
                                            placeholder={newBudget.type === "budget" ? "Budget Name (e.g. Monthly Budget)" : "Savings Goal Name (e.g. Emergency Fund)"}
                                            value={newBudget.name}
                                            onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                                        />

                                        <Input
                                            type="number"
                                            placeholder="Target Amount (৳)"
                                            value={newBudget.target_amount}
                                            onChange={(e) => setNewBudget({ ...newBudget, target_amount: e.target.value })}
                                        />

                                        {newBudget.type === "budget" && (
                                            <>
                                                <Select
                                                    value={newBudget.period || "monthly"}
                                                    onValueChange={(v) => setNewBudget({ ...newBudget, period: v as "monthly" | "weekly" | "yearly" })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Period" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                        <SelectItem value="yearly">Yearly</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                {/* Period-based Date Selector */}
                                                <div className="flex gap-2">
                                                    {newBudget.period === "weekly" && (
                                                        <Input
                                                            type="date"
                                                            value={`${newBudget.start_year}-${String(newBudget.start_month).padStart(2, '0')}-01`}
                                                            onChange={(e) => {
                                                                const d = new Date(e.target.value);
                                                                setNewBudget({
                                                                    ...newBudget,
                                                                    start_month: d.getMonth() + 1,
                                                                    start_year: d.getFullYear()
                                                                });
                                                            }}
                                                            className="flex-1"
                                                        />
                                                    )}
                                                    {newBudget.period === "monthly" && (
                                                        <>
                                                            <Select
                                                                value={String(newBudget.start_month)}
                                                                onValueChange={(v) => setNewBudget({ ...newBudget, start_month: parseInt(v) })}
                                                            >
                                                                <SelectTrigger className="flex-1">
                                                                    <SelectValue placeholder="Month" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                                                                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Select
                                                                value={String(newBudget.start_year)}
                                                                onValueChange={(v) => setNewBudget({ ...newBudget, start_year: parseInt(v) })}
                                                            >
                                                                <SelectTrigger className="w-24">
                                                                    <SelectValue placeholder="Year" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </>
                                                    )}
                                                    {newBudget.period === "yearly" && (
                                                        <Select
                                                            value={String(newBudget.start_year)}
                                                            onValueChange={(v) => setNewBudget({ ...newBudget, start_year: parseInt(v) })}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Year" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>

                                                <Input
                                                    placeholder="Category (optional, leave blank for all expenses)"
                                                    value={newBudget.category}
                                                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                                                />
                                            </>
                                        )}

                                        <Button
                                            className="w-full"
                                            onClick={async () => {
                                                if (!newBudget.name || !newBudget.target_amount) return;
                                                // Build start_date from month/year for monthly/yearly budgets
                                                const startDate = newBudget.type === "budget"
                                                    ? `${newBudget.start_year}-${String(newBudget.start_month).padStart(2, '0')}-01`
                                                    : null;
                                                await addBudget.mutateAsync({
                                                    name: newBudget.name,
                                                    type: newBudget.type,
                                                    target_amount: parseFloat(newBudget.target_amount),
                                                    period: newBudget.type === "budget" ? newBudget.period : null,
                                                    category: newBudget.category || null,
                                                    start_date: startDate,
                                                });
                                                setNewBudget({
                                                    name: "",
                                                    type: "budget",
                                                    target_amount: "",
                                                    period: "monthly",
                                                    category: "",
                                                    start_month: new Date().getMonth() + 1,
                                                    start_year: new Date().getFullYear(),
                                                });
                                                setIsBudgetDialogOpen(false);
                                            }}
                                            disabled={addBudget.isPending}
                                        >
                                            {addBudget.isPending ? "Creating..." : `Create ${newBudget.type}`}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* List existing budgets/savings based on view mode */}
                        {(() => {
                            const currentBudgetGoals = financeViewMode === "default" ? budgetGoals : specialBudgetGoals;
                            const currentSavingsGoals = financeViewMode === "default" ? savingsGoals : specialSavingsGoals;
                            const allGoals = [...currentBudgetGoals, ...currentSavingsGoals];

                            if (allGoals.length === 0) return null;

                            return (
                                <div className="mt-3 space-y-2">
                                    {/* Sorting Header */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                        <span>{financeViewMode === "special" ? "⭐ " : ""}Goals ({allGoals.length})</span>
                                        <Select value={goalsSortBy} onValueChange={(v) => setGoalsSortBy(v as "date" | "amount")}>
                                            <SelectTrigger className="h-6 w-28 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="date">Sort by Date</SelectItem>
                                                <SelectItem value="amount">Sort by Amount</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="max-h-28 overflow-y-auto pr-1 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                                        {allGoals
                                            .sort((a, b) => {
                                                if (goalsSortBy === "amount") {
                                                    return b.target_amount - a.target_amount;
                                                }
                                                // Sort by date (created_at)
                                                return (b.created_at || "").localeCompare(a.created_at || "");
                                            })
                                            .map(item => {
                                                const isBudget = item.type === "budget";
                                                const remaining = isBudget ? getBudgetRemaining(item) : 0;
                                                return (
                                                    <div key={item.id} className="flex flex-col xs:flex-row xs:items-center xs:justify-between text-xs sm:text-sm p-2 bg-secondary/50 rounded-lg gap-1 xs:gap-0">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {isBudget ? (
                                                                <Target className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                                            ) : (
                                                                <PiggyBank className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                                            )}
                                                            <span className="truncate">{item.name}</span>
                                                            {item.is_special && <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                                                        </div>
                                                        <div className="flex items-center gap-1 justify-between xs:justify-end ml-5 xs:ml-0">
                                                            {isBudget ? (
                                                                <span className={`text-xs ${remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                                    ৳{remaining.toLocaleString()}<span className="text-muted-foreground">/{item.target_amount.toLocaleString()}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-purple-400">
                                                                    ৳{item.current_amount.toLocaleString()}<span className="text-muted-foreground">/{item.target_amount.toLocaleString()}</span>
                                                                </span>
                                                            )}
                                                            {/* Toggle Special Status */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => updateBudget.mutate({ id: item.id, is_special: !item.is_special })}
                                                                title={item.is_special ? "Remove from Special" : "Mark as Special"}
                                                            >
                                                                <Star className={`w-3 h-3 ${item.is_special ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                                                            </Button>
                                                            {!isBudget && (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                            <Plus className="w-3 h-3" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-48">
                                                                        <div className="space-y-2">
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Amount"
                                                                                value={savingsAmount}
                                                                                onChange={(e) => setSavingsAmount(e.target.value)}
                                                                            />
                                                                            <Button
                                                                                size="sm"
                                                                                className="w-full"
                                                                                onClick={() => {
                                                                                    if (savingsAmount) {
                                                                                        addToSavings.mutate({ id: item.id, amount: parseFloat(savingsAmount) });
                                                                                        setSavingsAmount("");
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Add to Savings
                                                                            </Button>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            )}
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                        <Pencil className="w-3 h-3" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-48">
                                                                    <div className="space-y-2">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="New target"
                                                                            defaultValue={item.target_amount}
                                                                            id={`edit-goal-${item.id}`}
                                                                        />
                                                                        <Button
                                                                            size="sm"
                                                                            className="w-full"
                                                                            onClick={() => {
                                                                                const input = document.getElementById(`edit-goal-${item.id}`) as HTMLInputElement;
                                                                                if (input?.value) {
                                                                                    updateBudget.mutate({ id: item.id, target_amount: parseFloat(input.value) });
                                                                                }
                                                                            }}
                                                                        >
                                                                            Update Target
                                                                        </Button>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBudget.mutate(item.id)}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            );
                        })()}
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
                        {
                            viewMode === "daily" ? (
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
                            )
                        }
                    </motion.div >

                    {/* Recent Transactions */}
                    < motion.div
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
                                    <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 gap-2">
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                            <div className={`p-1 sm:p-1.5 rounded-full flex-shrink-0 ${entry.type === "income" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                                                {entry.type === "income" ? (
                                                    <TrendingUp className="w-3 h-3 text-green-400" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm font-medium truncate">{entry.category}</p>
                                                {entry.description && (
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{entry.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <span className={`text-xs sm:text-sm font-medium ${entry.type === "income" ? "text-green-400" : "text-red-400"}`}>
                                                {entry.type === "income" ? "+" : "-"}৳{entry.amount}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 sm:h-6 sm:w-6"
                                                onClick={() => deleteEntry.mutate(entry.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div >
                </div >
            </motion.div >

            {/* History Modal - Mobile Responsive */}
            <AnimatePresence>
                {
                    isHistoryOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
                            onClick={() => setIsHistoryOpen(false)}
                        >
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-background rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden sm:m-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Handle bar for mobile */}
                                <div className="sm:hidden flex justify-center pt-2">
                                    <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                                </div>
                                <div className="p-4 border-b flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <h2 className="text-xl font-bold">
                                            {historyType === "all" ? "All Transactions" : historyType === "income" ? "Income History" : "Expense History"}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => generatePDF(
                                                historyType === "all" ? "All Transactions" : historyType === "income" ? "Income History" : "Expense History",
                                                historyEntries,
                                                "finance"
                                            )}
                                            className="gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="hidden sm:inline">PDF</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="p-4 overflow-y-scroll max-h-[60vh] space-y-2">
                                    {historyEntries.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No transactions found</p>
                                    ) : (
                                        historyEntries.map((entry, index) => (
                                            <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground font-mono w-5">{index + 1}.</span>
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
                    )
                }
            </AnimatePresence >

            {/* Edit Entry Dialog */}
            < Dialog open={!!editingEntry
            } onOpenChange={(open) => !open && setEditingEntry(null)}>
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
                                        value={(editingEntry.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(editingEntry.category) ? editingEntry.category : (editingEntry.category ? "Other" : "")}
                                        onValueChange={(v) => {
                                            if (v === "Other") {
                                                setEditingEntry({ ...editingEntry, category: "" });
                                            } else {
                                                setEditingEntry({ ...editingEntry, category: v });
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(editingEntry.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {(!(editingEntry.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(editingEntry.category) && editingEntry.category !== "") || (editingEntry.category === "") ? (
                                        <Input
                                            value={editingEntry.category}
                                            onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
                                            placeholder="Enter custom category"
                                            className="mt-2"
                                        />
                                    ) : null}
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
            </Dialog >

            {/* Savings History Modal - Mobile Responsive */}
            <AnimatePresence>
                {isSavingsHistoryOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
                        onClick={() => setIsSavingsHistoryOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-background rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] overflow-hidden sm:m-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Handle bar for mobile */}
                            <div className="sm:hidden flex justify-center pt-2">
                                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                            </div>
                            <div className="p-4 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PiggyBank className="w-5 h-5 text-purple-400" />
                                    <div>
                                        <h2 className="text-lg font-bold">Savings History</h2>
                                        <p className="text-xs text-muted-foreground">
                                            Total: ৳{totalSavings.toLocaleString()} across {savingsGoals.length} goal(s)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => generatePDF("Savings History", savingsTransactions, "savings")}
                                        className="gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="hidden sm:inline">PDF</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsSavingsHistoryOpen(false)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)] sm:max-h-[calc(80vh-80px)] space-y-2">
                                {savingsTransactions.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        No savings transactions yet.
                                    </p>
                                ) : (
                                    savingsTransactions.map(tx => {
                                        const savings = savingsGoals.find(s => s.id === tx.savings_id);
                                        return (
                                            <div key={tx.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${tx.type === "deposit" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                                                        {tx.type === "deposit" ? (
                                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                                        ) : (
                                                            <TrendingDown className="w-4 h-4 text-red-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{savings?.name || "Savings"}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(tx.date + "T12:00:00"), "EEE, MMM d, yyyy")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`font-semibold mr-2 ${tx.type === "deposit" ? "text-green-400" : "text-red-400"}`}>
                                                        {tx.type === "deposit" ? "+" : "-"}৳{tx.amount.toLocaleString()}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-secondary"
                                                        onClick={() => setEditingSavingsTransaction(tx)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                                        onClick={() => deleteSavingsTransaction.mutate({
                                                            id: tx.id,
                                                            savingsId: tx.savings_id,
                                                            amount: tx.amount,
                                                            type: tx.type
                                                        })}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Savings Transaction Dialog */}
            < Dialog open={!!editingSavingsTransaction} onOpenChange={(open) => !open && setEditingSavingsTransaction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Transaction</DialogTitle>
                        <DialogDescription>
                            Update this savings transaction.
                        </DialogDescription>
                    </DialogHeader>
                    {editingSavingsTransaction && (
                        <div className="space-y-4 pt-4">
                            <Tabs
                                value={editingSavingsTransaction.type}
                                onValueChange={(v) => setEditingSavingsTransaction({ ...editingSavingsTransaction, type: v as "deposit" | "withdraw" })}
                            >
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="deposit" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">Deposit</TabsTrigger>
                                    <TabsTrigger value="withdraw" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Withdraw</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount</label>
                                <Input
                                    type="number"
                                    value={editingSavingsTransaction.amount}
                                    onChange={(e) => setEditingSavingsTransaction({ ...editingSavingsTransaction, amount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start gap-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            {format(new Date(editingSavingsTransaction.date + "T12:00:00"), "MMM d, yyyy")}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={new Date(editingSavingsTransaction.date + "T12:00:00")}
                                            onSelect={(date) => date && setEditingSavingsTransaction({ ...editingSavingsTransaction, date: getLocalDateStr(date) })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Input
                                    value={editingSavingsTransaction.description || ""}
                                    onChange={(e) => setEditingSavingsTransaction({ ...editingSavingsTransaction, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setEditingSavingsTransaction(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        // We need the original transaction to calculate differences
                                        // But we are editing the state in place.
                                        // Wait, if I edit state in place, I lose the original values needed for `updateSavingsTransaction`.
                                        // I should have kept `editingSavingsTransaction` as the *new* state and find the *original* from the list?
                                        // Or store `originalTransaction` separately?
                                        // Actually `savingsTransactions` query data has the original.
                                        const original = savingsTransactions.find(t => t.id === editingSavingsTransaction.id);
                                        if (original) {
                                            updateSavingsTransaction.mutate({
                                                id: editingSavingsTransaction.id,
                                                savingsId: editingSavingsTransaction.savings_id,
                                                oldAmount: original.amount,
                                                oldType: original.type,
                                                newAmount: editingSavingsTransaction.amount,
                                                newType: editingSavingsTransaction.type,
                                                newDate: editingSavingsTransaction.date,
                                                newDescription: editingSavingsTransaction.description || undefined
                                            });
                                            setEditingSavingsTransaction(null);
                                        }
                                    }}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog >
        </AppLayout >
    );
}

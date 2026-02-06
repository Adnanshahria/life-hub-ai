import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2, Calendar, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance, FinanceEntry } from "@/hooks/useFinance";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORIES = ["Food", "Transport", "Entertainment", "Bills", "Shopping", "Freelance", "Salary", "Other"];
const COLORS = ["#00D4AA", "#0EA5E9", "#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#6366F1", "#6B7280"];

export default function FinancePage() {
    const { entries, isLoading, addEntry, deleteEntry } = useFinance();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyType, setHistoryType] = useState<"all" | "income" | "expense">("all");

    // Date state - default to today
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

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

    // Filter entries by selected date
    const filteredEntries = useMemo(() => {
        return entries.filter(e => e.date?.split("T")[0] === selectedDate);
    }, [entries, selectedDate]);

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

    const chartData = Object.entries(expensesByCategory).map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
    }));

    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split("T")[0]);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        if (dateStr === today) return "Today";
        if (dateStr === yesterday) return "Yesterday";
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Finance</h1>
                        <p className="text-muted-foreground">Track your income and expenses</p>
                    </div>

                    {/* Date Selector */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-medium"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                        >
                            Today
                        </Button>
                    </div>

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
                                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="date"
                                        value={newEntry.date}
                                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                                        className="bg-transparent border-none outline-none text-sm flex-1"
                                    />
                                </div>

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

                {/* Current Date Display */}
                <div className="text-center py-2 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg">
                    <p className="text-lg font-semibold text-primary">{formatDate(selectedDate)}</p>
                </div>

                {/* Stats Cards - Now Clickable */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {/* Expense Chart */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-5"
                    >
                        <h3 className="font-semibold mb-4">Expenses by Category</h3>
                        {chartData.length > 0 ? (
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
                        )}
                    </motion.div>

                    {/* Recent Transactions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-5"
                    >
                        <h3 className="font-semibold mb-4">Transactions for {formatDate(selectedDate)}</h3>
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
                            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
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
                                                        {new Date(entry.date).toLocaleDateString("en-US", {
                                                            weekday: "short",
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric"
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-lg font-bold ${entry.type === "income" ? "text-green-400" : "text-red-400"}`}>
                                                    {entry.type === "income" ? "+" : "-"}৳{entry.amount.toLocaleString()}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
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
        </AppLayout>
    );
}

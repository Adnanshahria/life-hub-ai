import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Bot, User, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { processUserMessage, ChatMessage, AIIntent, executeAction, AllHooks } from "@/ai/core";
import { useTasks } from "@/hooks/useTasks";
import { useFinance } from "@/hooks/useFinance";
import { useBudget } from "@/hooks/useBudget";
import { useNotes } from "@/hooks/useNotes";
import { useHabits } from "@/hooks/useHabits";
import { useInventory } from "@/hooks/useInventory";
import { useStudy } from "@/hooks/useStudy";

export function AIChatInterface() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Hooks for executing actions
    const { addTask, updateTask, deleteTask, completeTask, tasks } = useTasks();
    const { addEntry, deleteEntry, updateEntry, expenses } = useFinance();
    const { addBudget, updateBudget, addToSavings, deleteBudget, budgets, savingsGoals } = useBudget();
    const { addNote, deleteNote, notes } = useNotes();
    const { addHabit, completeHabit, deleteHabit, habits } = useHabits();
    const { addItem, deleteItem, items } = useInventory();
    const { addChapter, updateProgress, deleteChapter, chapters } = useStudy();

    // Load history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("lifeos-chat-history");
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load chat history", e);
            }
        }
    }, []);

    // Save history to localStorage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem("lifeos-chat-history", JSON.stringify(messages));
        }
    }, [messages]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const executeIntent = async (intent: AIIntent) => {
        const { action, data } = intent;

        // Analysis/Chat actions don't need state mutation, just the response text
        if (["CHAT", "UNKNOWN", "GET_SUMMARY", "ANALYZE_BUDGET"].includes(action)) return;

        try {
            switch (action) {
                // TASKS
                case "ADD_TASK":
                    // Default to today's date if not specified - use LOCAL date, not UTC
                    const now = new Date();
                    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const hasExpectedCost = data.expected_cost && Number(data.expected_cost) > 0;
                    // If expected_cost is set, automatically set context_type to "finance"
                    const taskContextType = hasExpectedCost ? "finance" : ((data.context_type as string) || "general");
                    // Determine finance type
                    const taskFinanceType = (data.finance_type as "income" | "expense") || (hasExpectedCost ? "expense" : undefined);

                    // For expense tasks, link to budget
                    let taskBudgetId = data.budget_id as string | undefined;
                    if (taskFinanceType === "expense" && !taskBudgetId && budgets?.length > 0) {
                        // Find first available budget or match by name if specified
                        const matchingBudget = data.budget_name
                            ? budgets.find(b => b.type === "budget" && b.name.toLowerCase().includes((data.budget_name as string).toLowerCase()))
                            : budgets.find(b => b.type === "budget");
                        taskBudgetId = matchingBudget?.id;
                    }

                    // For income tasks, link to savings goal
                    let taskContextId = data.context_id as string | undefined;
                    if (taskFinanceType === "income" && !taskContextId && savingsGoals?.length > 0) {
                        // Find matching savings goal by name or use first available
                        const matchingSavings = data.savings_name
                            ? savingsGoals.find(s => s.name.toLowerCase().includes((data.savings_name as string).toLowerCase()))
                            : savingsGoals[0]; // Default to first savings goal
                        taskContextId = matchingSavings?.id;
                    }

                    await addTask.mutateAsync({
                        title: data.title as string,
                        priority: (data.priority as "low" | "medium" | "high" | "urgent") || "medium",
                        status: "todo",
                        due_date: (data.due_date as string) || today,
                        context_type: taskContextType as "general" | "study" | "finance" | "habit" | "project",
                        context_id: taskContextId,
                        expected_cost: hasExpectedCost ? Number(data.expected_cost) : undefined,
                        finance_type: taskFinanceType,
                        budget_id: taskBudgetId,
                    });
                    break;
                case "COMPLETE_TASK":
                    const taskToComplete = tasks?.find(t => t.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (taskToComplete) await completeTask.mutateAsync(taskToComplete.id);
                    break;
                case "DELETE_TASK":
                    const taskToDelete = tasks?.find(t => t.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (taskToDelete) await deleteTask.mutateAsync(taskToDelete.id);
                    break;

                // FINANCE
                case "ADD_EXPENSE":
                    await addEntry.mutateAsync({
                        type: "expense",
                        amount: Number(data.amount) || 0,
                        category: String(data.category || "Other"),
                        description: data.description ? String(data.description) : undefined,
                        date: data.date ? String(data.date) : undefined,
                    });
                    break;
                case "ADD_INCOME":
                    await addEntry.mutateAsync({
                        type: "income",
                        amount: Number(data.amount) || 0,
                        category: String(data.category || "Salary"),
                        description: data.description ? String(data.description) : undefined,
                        date: data.date ? String(data.date) : undefined,
                    });
                    break;
                case "DELETE_EXPENSE":
                    // Find by description if possible
                    const expenseToDelete = expenses?.find(e =>
                        (data.description && e.description?.toLowerCase().includes((data.description as string).toLowerCase())) ||
                        (data.amount && e.amount === Number(data.amount))
                    );
                    if (expenseToDelete) await deleteEntry.mutateAsync(expenseToDelete.id);
                    break;
                case "EDIT_EXPENSE":
                case "EDIT_INCOME":
                    if (data.id) {
                        await updateEntry.mutateAsync({
                            id: String(data.id),
                            amount: data.amount ? Number(data.amount) : undefined,
                            category: data.category ? String(data.category) : undefined,
                            description: data.description ? String(data.description) : undefined,
                            date: data.date ? String(data.date) : undefined,
                        });
                    }
                    break;

                // HABITS
                case "ADD_HABIT":
                    await addHabit.mutateAsync(data.habit_name as string);
                    break;
                case "COMPLETE_HABIT":
                    const habitToComplete = habits?.find(h => h.habit_name.toLowerCase().includes((data.habit_name as string || "").toLowerCase()));
                    if (habitToComplete) await completeHabit.mutateAsync(habitToComplete);
                    break;
                case "DELETE_HABIT":
                    const habitToDelete = habits?.find(h => h.habit_name.toLowerCase().includes((data.habit_name as string || "").toLowerCase()));
                    if (habitToDelete) await deleteHabit.mutateAsync(habitToDelete.id);
                    break;

                // NOTES
                case "ADD_NOTE":
                    await addNote.mutateAsync({
                        title: data.title as string,
                        content: data.content as string,
                        tags: data.tags as string,
                    });
                    break;
                case "DELETE_NOTE":
                    const noteToDelete = notes?.find(n => n.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (noteToDelete) await deleteNote.mutateAsync(noteToDelete.id);
                    break;

                // INVENTORY
                case "ADD_INVENTORY":
                    await addItem.mutateAsync({
                        item_name: data.item_name as string,
                        cost: Number(data.cost),
                        store: data.store as string,
                    });
                    break;
                case "DELETE_INVENTORY":
                    const itemToDelete = items?.find(i => i.item_name.toLowerCase().includes((data.item_name as string || "").toLowerCase()));
                    if (itemToDelete) await deleteItem.mutateAsync(itemToDelete.id);
                    break;

                // STUDY
                case "ADD_STUDY_CHAPTER":
                    await addChapter.mutateAsync({
                        subject: data.subject as string,
                        chapter_name: data.chapter_name as string,
                    });
                    break;
                case "UPDATE_STUDY_PROGRESS":
                    const chapterToUpdate = chapters?.find(
                        (c) =>
                            c.subject.toLowerCase() === (data.subject as string || "").toLowerCase() &&
                            c.chapter_name.toLowerCase().includes((data.chapter_name as string || "").toLowerCase())
                    );
                    if (chapterToUpdate) {
                        await updateProgress.mutateAsync({
                            id: chapterToUpdate.id,
                            progress_percentage: data.progress_percentage as number,
                        });
                    }
                    break;

                // BUDGET
                case "ADD_BUDGET":
                    await addBudget.mutateAsync({
                        name: data.name as string || "Monthly Budget",
                        type: "budget",
                        target_amount: Number(data.target_amount) || 0,
                        period: (data.period as "monthly" | "weekly" | "yearly") || "monthly",
                        category: data.category ? String(data.category) : null,
                    });
                    break;
                case "DELETE_BUDGET":
                    const budgetToDelete = budgets?.find(b =>
                        b.name.toLowerCase().includes((data.name as string || "").toLowerCase())
                    );
                    if (budgetToDelete) await deleteBudget.mutateAsync(budgetToDelete.id);
                    break;

                // SAVINGS
                case "ADD_SAVINGS":
                    await addBudget.mutateAsync({
                        name: data.name as string || "Savings Goal",
                        type: "savings",
                        target_amount: Number(data.target_amount) || 0,
                    });
                    break;
                case "ADD_TO_SAVINGS":
                    const savingsGoal = savingsGoals?.find(s =>
                        s.name.toLowerCase().includes((data.name as string || "").toLowerCase())
                    );
                    if (savingsGoal) {
                        await addToSavings.mutateAsync({
                            id: savingsGoal.id,
                            amount: Number(data.amount) || 0
                        });
                    }
                    break;
                case "DELETE_SAVINGS":
                    const savingsToDelete = savingsGoals?.find(s =>
                        s.name.toLowerCase().includes((data.name as string || "").toLowerCase())
                    );
                    if (savingsToDelete) await deleteBudget.mutateAsync(savingsToDelete.id);
                    break;

                // UPDATE BUDGET
                case "UPDATE_BUDGET":
                    const budgetToUpdate = budgets?.find(b =>
                        b.type === "budget" && b.name.toLowerCase().includes((data.name as string || "").toLowerCase())
                    );
                    if (budgetToUpdate) {
                        await updateBudget.mutateAsync({
                            id: budgetToUpdate.id,
                            target_amount: data.target_amount ? Number(data.target_amount) : undefined,
                            period: data.period as "monthly" | "weekly" | "yearly" | undefined,
                            category: data.category ? String(data.category) : undefined,
                            start_date: data.start_date ? String(data.start_date) : undefined,
                        });
                    }
                    break;

                // WITHDRAW FROM SAVINGS - also creates expense entry
                case "WITHDRAW_FROM_SAVINGS":
                    const savingsForWithdraw = savingsGoals?.find(s =>
                        s.name.toLowerCase().includes((data.name as string || "").toLowerCase())
                    );
                    if (savingsForWithdraw) {
                        const withdrawAmount = Number(data.amount) || 0;
                        // Update savings balance
                        await updateBudget.mutateAsync({
                            id: savingsForWithdraw.id,
                            current_amount: Math.max(0, savingsForWithdraw.current_amount - withdrawAmount),
                        });
                        // Create expense entry in finance history
                        const withdrawDate = new Date();
                        const withdrawDateStr = `${withdrawDate.getFullYear()}-${String(withdrawDate.getMonth() + 1).padStart(2, '0')}-${String(withdrawDate.getDate()).padStart(2, '0')}`;
                        await addEntry.mutateAsync({
                            type: "expense",
                            amount: withdrawAmount,
                            category: `Savings: ${savingsForWithdraw.name}`,
                            description: `Withdrawn from ${savingsForWithdraw.name}`,
                            date: withdrawDateStr,
                        });
                    }
                    break;

                // UPDATE SAVINGS
                case "UPDATE_SAVINGS":
                    const savingsToUpdate = savingsGoals?.find(s =>
                        s.name.toLowerCase().includes((data.name as string || "").toLowerCase())
                    );
                    if (savingsToUpdate) {
                        await updateBudget.mutateAsync({
                            id: savingsToUpdate.id,
                            target_amount: data.target_amount ? Number(data.target_amount) : undefined,
                            current_amount: data.current_amount ? Number(data.current_amount) : undefined,
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error("Action execution failed:", error);
            throw new Error("Failed to execute action");
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setIsLoading(true);

        try {
            // Calculate detailed context for AI
            const activeTasks = tasks?.filter(t => t.status === "todo").map(t => `- [${t.priority}] ${t.title} (Due: ${t.due_date})`).join("\n") || "No active tasks";
            const recentExpenses = expenses?.slice(0, 10).map(e => `- ${e.type === 'income' ? '+' : '-'}৳${e.amount}: ${e.description} (${e.category})`).join("\n") || "No recent transactions";
            const habitStatus = habits?.map(h => `- ${h.habit_name} (Streak: ${h.streak_count})`).join("\n") || "No habits tracked";
            const notesList = notes?.map(n => `- ${n.title} (${n.tags})`).join("\n") || "No notes";

            // Add budgets and savings info for AI
            const budgetsList = budgets?.filter(b => b.type === "budget").map(b => `- ${b.name}: ৳${b.target_amount} (${b.period})`).join("\n") || "No budgets";
            const savingsList = savingsGoals?.map(s => `- ${s.name}: ৳${s.current_amount}/${s.target_amount}`).join("\n") || "No savings goals";

            const context = `
Current Date: ${new Date().toLocaleDateString()}

[ACTIVE TASKS]
${activeTasks}

[RECENT FINANCE]
${recentExpenses}
Total Income: ৳${expenses?.filter(e => e.type === "income").reduce((a, b) => a + b.amount, 0) || 0}
Total Expenses: ৳${expenses?.filter(e => e.type === "expense").reduce((a, b) => a + b.amount, 0) || 0}

[BUDGETS]
${budgetsList}

[SAVINGS GOALS]
${savingsList}

[HABITS]
${habitStatus}

[NOTES]
${notesList}
`;

            // Process with history and context - pass current messages (not including the one we just added)
            const result = await processUserMessage(userMsg, messages.filter(m => m.role !== "system"), context);

            // Execute any detected action (skip CLARIFY - that's just the AI asking a question)
            if (!["CHAT", "UNKNOWN", "GET_SUMMARY", "ANALYZE_BUDGET", "CLARIFY"].includes(result.action)) {
                await executeIntent(result);
                toast.success("Action executed successfully");
            }

            setMessages(prev => [...prev, { role: "assistant", content: result.response_text }]);
        } catch (error) {
            console.error("AI Chat Error:", error);
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I ran into an error: ${errorMsg}` }]);
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-primary shadow-lg flex items-center justify-center glow-primary hover:scale-105 transition-transform"
                    onClick={() => setIsOpen(true)}
                >
                    <Sparkles className="w-6 h-6 text-white" />
                </motion.button>
            )}

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop Blur Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Chat Window Container - centers on mobile, positions bottom-right on desktop */}
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.9 }}
                            className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-50 flex items-center justify-center md:block"
                        >
                            <div className="w-[90%] md:w-[400px] h-[80%] md:h-[600px] md:max-h-[80vh] flex flex-col glass-card rounded-2xl overflow-hidden shadow-2xl border border-primary/20">
                                {/* Header */}
                                <div className="p-4 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">Nova</h3>
                                            <p className="text-[10px] text-muted-foreground">Your friendly AI assistant</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setMessages([])}
                                            className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
                                            title="Clear history"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-4 opacity-50">
                                            <Sparkles className="w-12 h-12 mb-2" />
                                            <p>Ask me to track expenses, add tasks, or just chat!</p>
                                            <div className="grid grid-cols-1 gap-2 text-xs w-full">
                                                <div className="p-2 bg-secondary/50 rounded cursor-pointer hover:bg-secondary transition-colors" onClick={() => { setInput("Add expense 500 for Food"); }}>"Add expense 500 for Food"</div>
                                                <div className="p-2 bg-secondary/50 rounded cursor-pointer hover:bg-secondary transition-colors" onClick={() => { setInput("Add task: Learn React"); }}>"Add task: Learn React"</div>
                                            </div>
                                        </div>
                                    )}
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                            ${msg.role === "user" ? "bg-secondary text-foreground" : "bg-primary/20 text-primary"}`}
                                            >
                                                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                            </div>
                                            <div
                                                className={`p-3 rounded-2xl max-w-[80%] text-sm 
                            ${msg.role === "user"
                                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                                        : "bg-secondary text-secondary-foreground rounded-tl-none"}`}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                <Bot className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="p-3 rounded-2xl bg-secondary rounded-tl-none">
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input Area */}
                                <form onSubmit={handleSend} className="p-4 bg-background/50 border-t border-border backdrop-blur-md">
                                    <div className="relative flex items-center">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Type a message..."
                                            className="w-full bg-secondary/50 border border-border rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim() || isLoading}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:bg-secondary disabled:text-muted-foreground transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

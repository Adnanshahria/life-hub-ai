import { useState, useRef, useEffect, useMemo } from "react";
import {
    Send,
    Sparkles,
    User,
    Bot,
    Loader2,
    X,
    Maximize2,
    Minimize2,
    Search,
    Trash2,
    Check,
    MessageSquare,
    MoreVertical,
    ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { processUserMessage, ChatMessage, AIIntent, executeAction, AllHooks } from "@/ai/core";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useFinance } from "@/hooks/useFinance";
import { useBudget } from "@/hooks/useBudget";
import { useNotes } from "@/hooks/useNotes";
import { useHabits } from "@/hooks/useHabits";
import { useInventory } from "@/hooks/useInventory";
import { useStudy } from "@/hooks/useStudy";
import { useAI } from "@/contexts/AIContext";

// Render inline markdown formatting: **bold**, *italic*
function renderFormattedText(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Bold: **text**
        const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
        if (boldMatch) {
            if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
            parts.push(<strong key={key++} className="font-semibold">{boldMatch[2]}</strong>);
            remaining = boldMatch[3];
            continue;
        }
        // Italic: *text*
        const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)(.*)/s);
        if (italicMatch) {
            if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
            parts.push(<em key={key++}>{italicMatch[2]}</em>);
            remaining = italicMatch[3];
            continue;
        }
        // Checklist: - [ ] or - [x]
        const checkMatch = remaining.match(/^(.*?)[-*]\s*\[([ xX])\]\s*(.*?)(?=\n|[-*]\s*\[|$)(.*)/s);
        if (checkMatch) {
            if (checkMatch[1]) parts.push(<span key={key++}>{checkMatch[1]}</span>);
            const checked = checkMatch[2].toLowerCase() === "x";
            parts.push(
                <div key={key++} className="flex items-start gap-2.5 py-1 select-none">
                    <div
                        className={cn(
                            "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                            checked
                                ? "bg-primary border-primary shadow-sm"
                                : "border-muted-foreground/30 bg-background/50"
                        )}
                    >
                        {checked && <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[3]" />}
                    </div>
                    <span className={cn("text-sm transition-all duration-300", checked && "line-through text-muted-foreground/60 italic")}>
                        {renderFormattedText(checkMatch[3])}
                    </span>
                </div>
            );
            remaining = checkMatch[4];
            continue;
        }
        // No more formatting
        parts.push(<span key={key++}>{remaining}</span>);
        break;
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function AIChatInterface() {
    const { isChatOpen: isOpen, setChatOpen: setIsOpen, bubbleMessage, bubbleAction, pageContext } = useAI();
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [viewportHeight, setViewportHeight] = useState<number | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Detect if keyboard is open (viewport significantly smaller than window)
    const keyboardOpen = isMobile && viewportHeight !== null && viewportHeight < window.innerHeight * 0.75;

    // Lock body scroll when chat is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setShowMenu(false);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const clearConversation = () => {
        setMessages([]);
        localStorage.removeItem("lifeos-chat-history");
        setShowMenu(false);
    };

    // Hooks for executing actions
    const { addTask, updateTask, deleteTask, completeTask, tasks } = useTasks();
    const { addEntry, deleteEntry, updateEntry, expenses } = useFinance();
    const { addBudget, updateBudget, addToSavings, deleteBudget, budgets, savingsGoals } = useBudget();
    const { addNote, updateNote, deleteNote, togglePin, updateColor, archiveNote, trashNote, notes } = useNotes();
    const { addHabit, completeHabit, deleteHabit, deleteAllHabits, habits } = useHabits();
    const { addItem, deleteItem, updateItem, items } = useInventory();
    const { subjects, chapters, parts, addSubject, addChapter, addPart, togglePartStatus, deleteSubject, deleteChapter, deletePart, commonPresets, addPresetsToChapter } = useStudy();

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

    // Keyboard shortcut - CMD+J for AI, CMD+K handled by GlobalSearch
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "j") {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // Handle Search Button Click
    const handleSearchClick = () => {
        window.dispatchEvent(new CustomEvent("openGlobalSearch"));
    };

    // Focus input on open - only on desktop to avoid triggering mobile keyboard
    useEffect(() => {
        if (isOpen && window.innerWidth >= 768) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
        // On mobile, explicitly blur to prevent keyboard
        if (isOpen && window.innerWidth < 768) {
            setTimeout(() => inputRef.current?.blur(), 50);
        }
    }, [isOpen]);

    // Track visual viewport height for mobile keyboard awareness
    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;
        const vv = window.visualViewport;
        const handleResize = () => {
            setViewportHeight(vv.height);
        };
        handleResize();
        vv.addEventListener('resize', handleResize);
        return () => vv.removeEventListener('resize', handleResize);
    }, [isOpen]);

    const executeIntent = async (intent: AIIntent) => {
        const { action, data } = intent;

        // Analysis/Chat actions don't need state mutation, just the response text
        if (["CHAT", "UNKNOWN", "GET_SUMMARY", "ANALYZE_BUDGET", "CLARIFY"].includes(action)) return;

        // Handle NAVIGATE action
        if (action === "NAVIGATE" && data.page) {
            window.location.href = String(data.page);
            return;
        }

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

                    console.log("AI ADD_TASK:", { title: data.title, priority: data.priority, due_date: (data.due_date as string) || today });
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
                    await addHabit.mutateAsync({ name: String(data.habit_name || data.name || ""), category: (data.category ? String(data.category) : "general") as import("@/hooks/useHabits").HabitCategory });
                    break;
                case "COMPLETE_HABIT":
                    const completeTarget = (data.habit_name as string || data.name as string || "").toLowerCase();
                    if (completeTarget === "all" || completeTarget === "every habit" || completeTarget === "everything") {
                        // Complete ALL habits for today
                        const todayStr = new Date().toISOString().split("T")[0];
                        if (habits && habits.length > 0) {
                            for (const h of habits) {
                                const alreadyDone = h.last_completed_date?.split("T")[0] === todayStr;
                                if (!alreadyDone) {
                                    await completeHabit.mutateAsync({ habit: h });
                                }
                            }
                        }
                    } else {
                        const habitToComplete = habits?.find(h => h.habit_name.toLowerCase().includes(completeTarget));
                        if (habitToComplete) await completeHabit.mutateAsync({ habit: habitToComplete });
                    }
                    break;
                case "DELETE_HABIT":
                    const habitName = (data.habit_name as string || "").toLowerCase();
                    if (habitName === "all" || habitName === "every habit") {
                        // Delete all habits using the bulk mutation
                        await deleteAllHabits.mutateAsync();
                    } else {
                        const habitToDelete = habits?.find(h => h.habit_name.toLowerCase().includes(habitName));
                        if (habitToDelete) await deleteHabit.mutateAsync(habitToDelete.id);
                    }
                    break;

                // NOTES
                case "ADD_NOTE":
                    await addNote.mutateAsync({
                        title: data.title as string,
                        content: data.content as string,
                        tags: data.tags as string,
                    });
                    break;
                case "UPDATE_NOTE": {
                    const noteToUpdate = notes?.find(n => n.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (noteToUpdate) {
                        await updateNote.mutateAsync({
                            ...noteToUpdate,
                            title: data.new_title ? String(data.new_title) : noteToUpdate.title,
                            content: data.content ? String(data.content) : noteToUpdate.content,
                            tags: data.tags !== undefined ? String(data.tags) : noteToUpdate.tags,
                        });
                    }
                    break;
                }
                case "DELETE_NOTE":
                    const noteToDelete = notes?.find(n => n.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (noteToDelete) await deleteNote.mutateAsync(noteToDelete.id);
                    break;
                case "TOGGLE_PIN_NOTE":
                    const noteToPin = notes?.find(n => n.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (noteToPin) togglePin.mutate(noteToPin);
                    break;
                case "CHANGE_NOTE_COLOR":
                    const noteToColor = notes?.find(n => n.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (noteToColor && data.color) updateColor.mutate({ id: noteToColor.id, color: String(data.color) as any });
                    break;
                case "ARCHIVE_NOTE":
                    const noteToArchive = notes?.find(n => n.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (noteToArchive) archiveNote.mutate({ id: noteToArchive.id, archive: data.archive !== false && data.archive !== "false" });
                    break;
                case "TRASH_NOTE":
                    const noteToTrash = notes?.find(n => n.title.toLowerCase().includes((data.title as string || "").toLowerCase()));
                    if (noteToTrash) trashNote.mutate({ id: noteToTrash.id, trash: data.trash !== false && data.trash !== "false" });
                    break;

                // INVENTORY
                case "ADD_INVENTORY":
                    await addItem.mutateAsync({
                        item_name: data.item_name as string,
                        quantity: Number(data.quantity) || 1,
                        category: data.category ? String(data.category) : undefined,
                        cost: data.cost ? Number(data.cost) : undefined,
                        store: data.store ? String(data.store) : undefined,
                        status: "active",
                    });
                    break;
                case "UPDATE_INVENTORY":
                    const itemToUpdate = items?.find(i =>
                        i.item_name.toLowerCase().includes((data.item_name as string || "").toLowerCase())
                    );
                    if (itemToUpdate) {
                        await updateItem.mutateAsync({
                            ...itemToUpdate,
                            ...data,
                            id: itemToUpdate.id
                        });
                    }
                    break;
                case "DELETE_INVENTORY":
                    const itemToDelete = items?.find(i =>
                        i.item_name.toLowerCase().includes((data.item_name as string || "").toLowerCase())
                    );
                    if (itemToDelete) await deleteItem.mutateAsync(itemToDelete.id);
                    break;

                // STUDY
                case "ADD_STUDY_SUBJECT":
                    await addSubject.mutateAsync(String(data.name || ""));
                    break;
                case "ADD_STUDY_CHAPTER": {
                    const subjectName = String(data.subject_name || data.subject || "").toLowerCase();
                    const subject = subjects?.find(s => s.name.toLowerCase().includes(subjectName));
                    if (subject) {
                        await addChapter.mutateAsync({ subjectId: subject.id, name: String(data.chapter_name || data.name || "") });
                    }
                    break;
                }
                case "ADD_STUDY_PART": {
                    const chName = String(data.chapter_name || "").toLowerCase();
                    const ch = chapters?.find(c => c.name.toLowerCase().includes(chName));
                    if (ch) {
                        await addPart.mutateAsync({ chapterId: ch.id, name: String(data.part_name || data.name || ""), estimatedMinutes: Number(data.estimated_minutes || 30) });
                    }
                    break;
                }
                case "UPDATE_STUDY_PART_STATUS": {
                    const pName = String(data.part_name || data.name || "").toLowerCase();
                    const part = parts?.find(p => p.name.toLowerCase().includes(pName));
                    if (part) await togglePartStatus.mutateAsync({ id: part.id, currentStatus: part.status });
                    break;
                }
                case "DELETE_STUDY_SUBJECT": {
                    const sName = String(data.subject_name || data.name || "").toLowerCase();
                    const subj = subjects?.find(s => s.name.toLowerCase().includes(sName));
                    if (subj) await deleteSubject.mutateAsync(subj.id);
                    break;
                }
                case "DELETE_STUDY_CHAPTER": {
                    const dcName = String(data.chapter_name || data.name || "").toLowerCase();
                    const dch = chapters?.find(c => c.name.toLowerCase().includes(dcName));
                    if (dch) await deleteChapter.mutateAsync(dch.id);
                    break;
                }
                case "DELETE_STUDY_PART": {
                    const dpName = String(data.part_name || data.name || "").toLowerCase();
                    const dp = parts?.find(p => p.name.toLowerCase().includes(dpName));
                    if (dp) await deletePart.mutateAsync(dp.id);
                    break;
                }
                case "ADD_STUDY_SUBCHAPTER": {
                    // Data: chapter_name, preset_name (or sub_chapter_name), target_part_name (optional)
                    const cName = String(data.chapter_name || data.chapter || "").toLowerCase();
                    const targetChapter = chapters?.find(c => c.name.toLowerCase().includes(cName));

                    if (targetChapter) {
                        const pName = String(data.preset_name || data.sub_chapter_name || data.name || "").toLowerCase();
                        // Find presets matching the name
                        const matchedPresets = commonPresets?.filter(p => !p.parent_id && p.name.toLowerCase().includes(pName));

                        if (matchedPresets && matchedPresets.length > 0) {
                            // Optional: Target Part
                            let targetPartId: string | undefined = undefined;
                            const tPartName = String(data.target_part_name || data.parent_part_name || "").toLowerCase();

                            if (tPartName === "all" || tPartName === "all parts") {
                                targetPartId = "all-parts";
                            } else if (tPartName) {
                                const tPart = parts?.find(p => p.chapter_id === targetChapter.id && p.name.toLowerCase().includes(tPartName));
                                if (tPart) targetPartId = tPart.id;
                            }

                            await addPresetsToChapter.mutateAsync({
                                chapterId: targetChapter.id,
                                presetIds: matchedPresets.map(p => p.id),
                                targetPartId: targetPartId
                            });
                        }
                    }
                    break;
                }

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
                        const withdrawDateStr = `${withdrawDate.getFullYear()} -${String(withdrawDate.getMonth() + 1).padStart(2, '0')} -${String(withdrawDate.getDate()).padStart(2, '0')} `;
                        await addEntry.mutateAsync({
                            type: "expense",
                            amount: withdrawAmount,
                            category: `Savings: ${savingsForWithdraw.name} `,
                            description: `Withdrawn from ${savingsForWithdraw.name} `,
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
            // 1. Gather Context Data
            const currentLocation = window.location.pathname; // using window.location since we might be outside Router context or just easier here. Actually better to use useLocation if inside Router.
            // Wait, AIChatInterface is likely inside AppLayout which is inside Router. Let's assume Router context.
            // But to be safe and avoid Hook errors if I forget the import in this block, I'll use window.location for now or add the hook.
            // Let's add the hook at the top level component.

            // TIME AWARENESS
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
            const todayStr = now.toISOString().split('T')[0];
            const timePeriod = hour < 5 ? 'Late Night' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 22 ? 'Evening' : 'Night';

            // TASK ANALYSIS
            const activeTasks = tasks?.filter(t => t.status === 'todo' || t.status === 'in-progress') || [];
            const overdueTasks = activeTasks.filter(t => t.due_date && t.due_date < todayStr);
            const todayTasks = activeTasks.filter(t => t.due_date === todayStr);
            const urgentTasks = activeTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
            const completedTasks = tasks?.filter(t => t.status === 'done') || [];

            // HABIT ANALYSIS
            const habitsData = habits?.map(h => ({
                name: h.habit_name,
                streak: h.streak_count || 0,
                done_today: h.last_completed_date?.startsWith(todayStr) ?? false,
            })) || [];
            const pendingHabits = habitsData.filter(h => !h.done_today);
            const completedHabits = habitsData.filter(h => h.done_today);

            // FINANCE ANALYSIS
            const totalIncome = expenses?.filter(e => e.type === 'income').reduce((a, b) => a + b.amount, 0) || 0;
            const totalExpense = expenses?.filter(e => e.type === 'expense').reduce((a, b) => a + b.amount, 0) || 0;
            const balance = totalIncome - totalExpense;
            const todaySpending = expenses?.filter(e => e.type === 'expense' && e.date === todayStr).reduce((a, b) => a + b.amount, 0) || 0;

            // NOTE ANALYSIS (include content previews + checklist stats)
            const notesData = notes?.map(n => {
                const content = n.content || '';
                const totalChecks = (content.match(/\[[ xX]\]/g) || []).length;
                const doneChecks = (content.match(/\[[xX]\]/g) || []).length;
                return {
                    title: n.title,
                    tags: n.tags,
                    preview: content.substring(0, 500),
                    checklist: totalChecks > 0 ? `${doneChecks}/${totalChecks} done` : null,
                };
            }) || [];

            const contextString = `
[SYSTEM CONTEXT - GOD MODE - OMNISCIENT]
â° Current Time: ${hour}:${String(minute).padStart(2, '0')} (${timePeriod})
ðŸ“… Day: ${dayOfWeek}, ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
ðŸ“ Current Page: ${window.location.pathname}
ðŸ“ Page Context: ${pageContext}

â•â•â• TASKS (${activeTasks.length} active) â•â•â•
ðŸ”´ OVERDUE (${overdueTasks.length}): ${overdueTasks.map(t => `"${t.title}" (was due ${t.due_date})`).join(', ') || 'None'}
ðŸŸ¡ DUE TODAY (${todayTasks.length}): ${todayTasks.map(t => `"${t.title}" [${t.priority}]`).join(', ') || 'None'}
ðŸ”¥ URGENT/HIGH: ${urgentTasks.map(t => `"${t.title}" (due ${t.due_date || 'no date'})`).join(', ') || 'None'}
All Active:
${activeTasks.map(t => `- [${t.priority?.toUpperCase()}] ${t.title} (Due: ${t.due_date || 'none'}) [${t.context_type || 'general'}]${t.start_time ? ` â°${t.start_time}-${t.end_time}` : ''}`).join('\n') || '(no active tasks)'}
Recently Completed: ${completedTasks.slice(0, 5).map(t => t.title).join(', ') || 'None'}

â•â•â• HABITS (${completedHabits.length}/${habitsData.length} done today) â•â•â•
âœ… Completed: ${completedHabits.map(h => `${h.name} (streak: ${h.streak})`).join(', ') || 'None yet'}
â³ Pending: ${pendingHabits.map(h => `${h.name} (streak: ${h.streak}${h.streak >= 3 ? ' ðŸ”¥' : ''})`).join(', ') || 'All done!'}

â•â•â• FINANCE â•â•â•
ðŸ’° Balance: à§³${balance} (Income: à§³${totalIncome}, Expenses: à§³${totalExpense})
ðŸ“Š Today's Spending: à§³${todaySpending}
Recent 10 Transactions:
${expenses?.slice(0, 10).map(t => `- ${t.date || 'N/A'}: ${t.type?.toUpperCase()} à§³${t.amount} (${t.category}) "${t.description}"`).join('\n') || '(no transactions)'}
Budgets: ${budgets?.filter(b => b.type === 'budget').map(b => `${b.name}: à§³${b.target_amount}/${b.period}`).join(', ') || 'None'}
Savings: ${savingsGoals?.map(s => `${s.name}: à§³${s.current_amount}/à§³${s.target_amount}`).join(', ') || 'None'}

â•â•â• STUDY â•â•â•
${subjects?.map(s => {
                const sChapters = chapters?.filter(c => c.subject_id === s.id) || [];
                const sParts = parts?.filter(p => sChapters.some(c => c.id === p.chapter_id)) || [];
                const done = sParts.filter(p => p.status === 'completed').length;
                return `${s.name}: ${sChapters.length} ch, ${done}/${sParts.length} parts done`;
            }).join('\n') || '(no study data)'}
Available Presets (Sub-Chapters): ${commonPresets?.filter(p => !p.parent_id).map(p => p.name).join(', ') || 'None'}

â•â•â• NOTES (${notesData.length} total) â•â•â•
${notesData.map(n => `- "${n.title}" [${n.tags || 'no tags'}]${n.checklist ? ` â˜‘ï¸${n.checklist}` : ''} â†’ ${n.preview.replace(/\n/g, ' ').substring(0, 80)}...`).join('\n') || '(no notes)'}

â•â•â• INVENTORY â•â•â•
${items?.map(i => `- ${i.item_name} (x${i.quantity}) [${i.category || 'uncategorized'}] ${i.status === 'sold' ? '(SOLD)' : ''} ${i.cost ? `à§³${i.cost}` : ''}`).join('\n') || '(no items)'}
`;

            // Process with history and context
            const results = await processUserMessage(userMsg, messages.filter(m => m.role !== "system"), contextString);

            // Execute all detected actions (supports batch)
            let actionsExecuted = 0;
            for (const result of results) {
                if (!["CHAT", "UNKNOWN", "GET_SUMMARY", "ANALYZE_BUDGET", "CLARIFY"].includes(result.action)) {
                    await executeIntent(result);
                    actionsExecuted++;
                }
            }
            if (actionsExecuted > 0) {
                toast.success(actionsExecuted > 1 ? `${actionsExecuted} actions executed!` : "Action executed successfully");
            }

            // Use the response text from the first intent (carries the combined summary)
            const responseText = results[0]?.response_text || "Done!";
            setMessages(prev => [...prev, { role: "assistant", content: responseText }]);
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
            {/* Search Trigger Button */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="hidden md:flex fixed bottom-36 md:bottom-24 right-4 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-secondary shadow-lg items-center justify-center hover:scale-105 transition-transform border border-border"
                    onClick={handleSearchClick}
                >
                    <Search className="w-6 h-6 text-foreground" />
                </motion.button>
            )}

            {/* Smart Bubble */}
            <AnimatePresence>
                {!isOpen && bubbleMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-50 max-w-[250px] pointer-events-auto"
                    >
                        <div
                            className="bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-sm shadow-xl cursor-pointer hover:bg-primary/90 transition-colors relative"
                            onClick={() => {
                                if (bubbleAction) bubbleAction();
                                setIsOpen(true);
                            }}
                        >
                            <div className="text-sm font-medium">{bubbleMessage}</div>
                            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rotate-45 transform origin-center" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger Button for AI */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="hidden md:flex fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-primary shadow-lg items-center justify-center glow-primary hover:scale-105 transition-transform"
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

                        {/* Chat Window Container - 90dvh bottom sheet on mobile, bottom-right on desktop */}
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className={`fixed left-0 right-0 bottom-0 md:inset-auto md:bottom-6 md:right-6 z-50 ${keyboardOpen ? '' : 'rounded-t-3xl'
                                } md:rounded-2xl overflow-hidden`}
                            style={isMobile ? {
                                height: viewportHeight ? viewportHeight : '90dvh',
                                maxHeight: keyboardOpen ? undefined : '90dvh'
                            } : undefined}
                        >
                            <div className={`w-full md:w-[400px] h-full md:h-[600px] md:max-h-[80vh] flex flex-col bg-background md:glass-card overflow-hidden shadow-2xl ${keyboardOpen ? 'border-x border-primary/20' : 'border border-primary/20 md:rounded-2xl'
                                }`}>
                                {/* Header */}
                                <div className={`px-5 py-4 bg-background flex items-center justify-between z-10 relative shadow-sm ${keyboardOpen ? 'border-b border-border/20' : 'border-b border-border/20'
                                    }`}>
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-[15px] tracking-tight text-foreground">LifeSolver AI</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">ONLINE</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="flex items-center gap-1 px-2.5 py-1.5 border border-border/50 rounded-full">
                                            <button onClick={() => setShowMenu(!showMenu)} className="hover:bg-secondary/50 rounded-full p-0.5 transition-colors">
                                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                            <button onClick={() => setIsOpen(false)} className="hover:bg-secondary/50 rounded-full p-0.5 transition-colors">
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                    {showMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute top-[60px] left-0 right-0 z-[210] bg-background border-b border-border/30 shadow-lg px-5 py-3"
                                        >
                                            {/* Clear Conversation */}
                                            <button
                                                onClick={clearConversation}
                                                className="flex items-center gap-2 w-full py-2 px-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span className="text-xs font-semibold">Clear Conversation</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Messages Area */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.length === 0 && (
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-transparent text-primary mt-1">
                                                <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.5} />
                                            </div>
                                            <div className="p-4 rounded-[20px] rounded-tl-sm bg-primary/5 text-foreground w-[85%]">
                                                <h4 className="text-xl font-bold text-primary mb-2">Welcome!</h4>
                                                <p className="text-[13px] text-foreground/80 font-medium leading-relaxed">I'm your AI assistant. Ask me anything about your tasks, finances, notes, habits, or anything else!</p>
                                            </div>
                                        </div>
                                    )}
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                                        >
                                            <div
                                                className={`w-8 h-8 flex justify-center shrink-0 
                                                ${msg.role === "user" ? "hidden" : "text-primary mt-1"}`}
                                            >
                                                {msg.role === "assistant" && <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.5} />}
                                            </div>
                                            <div
                                                className={`p-3.5 rounded-[20px] max-w-[85%] text-[13.5px] border 
                            ${msg.role === "user"
                                                        ? "bg-primary/5 text-foreground rounded-tr-sm border-primary/20"
                                                        : "bg-primary/5 text-foreground rounded-tl-sm border-transparent"}`}
                                            >
                                                {msg.role === "assistant" ? (
                                                    <div className="space-y-2 leading-relaxed font-medium">
                                                        {msg.content.split('\n').map((line, li) => {
                                                            if (!line.trim()) return <div key={li} className="h-1" />;
                                                            return (
                                                                <p key={li} className="">
                                                                    {renderFormattedText(line)}
                                                                </p>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="font-medium text-foreground">{msg.content}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 flex justify-center shrink-0 mt-1 text-primary">
                                                <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.5} />
                                            </div>
                                            <div className="p-4 rounded-[20px] rounded-tl-sm bg-primary/5 border border-transparent">
                                                <div className="flex gap-1.5">
                                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input Area */}
                                <form onSubmit={handleSend} className="p-3 md:p-4 bg-background border-t border-border/20 relative z-20" style={{ paddingBottom: isMobile ? (keyboardOpen ? '0.75rem' : 'max(1.5rem, env(safe-area-inset-bottom))') : undefined }}>
                                    <div className="flex items-end gap-2.5">
                                        <textarea
                                            value={input}
                                            onChange={(e) => {
                                                setInput(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                            placeholder="Ask me anything about our services..."
                                            autoFocus={false}
                                            className="flex-1 bg-primary/5 border border-primary/20 rounded-2xl py-3.5 px-4 text-[13.5px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none min-h-[48px] max-h-[120px] font-medium placeholder:text-muted-foreground"
                                            disabled={isLoading}
                                            rows={1}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim() || isLoading}
                                            className="w-12 h-12 shrink-0 rounded-[14px] bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:bg-secondary disabled:text-muted-foreground transition-all hover:opacity-90 active:scale-95 shadow-sm"
                                        >
                                            <Send className="w-5 h-5 ml-0.5" strokeWidth={2} />
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

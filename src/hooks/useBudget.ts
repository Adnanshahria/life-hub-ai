import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "./useFinance";

export interface Budget {
    id: string;
    user_id: string;
    name: string;
    type: "budget" | "savings";
    target_amount: number;
    current_amount: number;
    period: "monthly" | "weekly" | "yearly" | null;
    category: string | null;
    start_date: string | null;
    is_special?: boolean;
    created_at: string;
}

export interface SavingsTransaction {
    id: string;
    savings_id: string;
    user_id: string;
    type: "deposit" | "withdraw";
    amount: number;
    description: string | null;
    date: string;
    created_at: string;
}

export function useBudget() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;
    const { expenses } = useFinance();

    const budgetQuery = useQuery({
        queryKey: ["budgets", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM budgets WHERE user_id = ? ORDER BY created_at DESC",
                args: [userId],
            });
            return result.rows as unknown as Budget[];
        },
        enabled: !!userId,
    });

    // Query savings transactions
    const savingsTransactionsQuery = useQuery({
        queryKey: ["savings_transactions", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM savings_transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC",
                args: [userId],
            });
            return result.rows as unknown as SavingsTransaction[];
        },
        enabled: !!userId,
    });

    const addBudget = useMutation({
        mutationFn: async (budget: {
            name: string;
            type: "budget" | "savings";
            target_amount: number;
            period?: "monthly" | "weekly" | "yearly" | null;
            category?: string | null;
            start_date?: string | null;
            is_special?: boolean;
        }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            await db.execute({
                sql: "INSERT INTO budgets (id, user_id, name, type, target_amount, current_amount, period, category, start_date, is_special) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)",
                args: [id, userId, budget.name, budget.type, budget.target_amount, budget.period || null, budget.category || null, budget.start_date || null, budget.is_special ? 1 : 0],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    });

    const updateBudget = useMutation({
        mutationFn: async (budget: {
            id: string;
            name?: string;
            target_amount?: number;
            current_amount?: number;
            period?: "monthly" | "weekly" | "yearly" | null;
            category?: string | null;
            start_date?: string | null;
            is_special?: boolean;
        }) => {
            const updates: string[] = [];
            const args: (string | number | null)[] = [];

            if (budget.name) { updates.push("name = ?"); args.push(budget.name); }
            if (budget.target_amount !== undefined) { updates.push("target_amount = ?"); args.push(budget.target_amount); }
            if (budget.current_amount !== undefined) { updates.push("current_amount = ?"); args.push(budget.current_amount); }
            if (budget.period !== undefined) { updates.push("period = ?"); args.push(budget.period); }
            if (budget.category !== undefined) { updates.push("category = ?"); args.push(budget.category); }
            if (budget.start_date !== undefined) { updates.push("start_date = ?"); args.push(budget.start_date); }
            if (budget.is_special !== undefined) { updates.push("is_special = ?"); args.push(budget.is_special ? 1 : 0); }

            if (updates.length === 0) return;
            args.push(budget.id);
            await db.execute({
                sql: `UPDATE budgets SET ${updates.join(", ")} WHERE id = ?`,
                args
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    });

    // Add to savings and record transaction
    const addToSavings = useMutation({
        mutationFn: async ({ id, amount, description }: { id: string; amount: number; description?: string }) => {
            if (!userId) throw new Error("Not authenticated");

            // Update savings balance
            await db.execute({
                sql: "UPDATE budgets SET current_amount = current_amount + ? WHERE id = ?",
                args: [amount, id],
            });

            // Record transaction
            const txId = generateId();
            const type = amount >= 0 ? "deposit" : "withdraw";
            const today = new Date().toISOString().split("T")[0];
            await db.execute({
                sql: "INSERT INTO savings_transactions (id, savings_id, user_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                args: [txId, id, userId, type, Math.abs(amount), description || null, today],
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
            queryClient.invalidateQueries({ queryKey: ["savings_transactions"] });
        },
    });

    const deleteSavingsTransaction = useMutation({
        mutationFn: async ({ id, savingsId, amount, type }: { id: string; savingsId: string; amount: number; type: "deposit" | "withdraw" }) => {
            // Delete the transaction
            await db.execute({ sql: "DELETE FROM savings_transactions WHERE id = ?", args: [id] });

            // Reverse the amount in the savings goal
            const reverseAmount = type === "deposit" ? -amount : amount;
            await db.execute({
                sql: "UPDATE budgets SET current_amount = current_amount + ? WHERE id = ?",
                args: [reverseAmount, savingsId],
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
            queryClient.invalidateQueries({ queryKey: ["savings_transactions"] });
        },
    });

    // Update savings transaction (for editing)
    const updateSavingsTransaction = useMutation({
        mutationFn: async ({
            id,
            savingsId,
            oldAmount,
            oldType,
            newAmount,
            newType,
            newDate,
            newDescription
        }: {
            id: string;
            savingsId: string;
            oldAmount: number;
            oldType: "deposit" | "withdraw";
            newAmount: number;
            newType: "deposit" | "withdraw";
            newDate: string;
            newDescription?: string;
        }) => {
            // First reverse the old transaction effect
            const reverseOld = oldType === "deposit" ? -oldAmount : oldAmount;
            await db.execute({
                sql: "UPDATE budgets SET current_amount = current_amount + ? WHERE id = ?",
                args: [reverseOld, savingsId],
            });

            // Apply new transaction effect
            const applyNew = newType === "deposit" ? newAmount : -newAmount;
            await db.execute({
                sql: "UPDATE budgets SET current_amount = current_amount + ? WHERE id = ?",
                args: [applyNew, savingsId],
            });

            // Update the transaction record
            await db.execute({
                sql: "UPDATE savings_transactions SET amount = ?, type = ?, date = ?, description = ? WHERE id = ?",
                args: [newAmount, newType, newDate, newDescription || null, id],
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
            queryClient.invalidateQueries({ queryKey: ["savings_transactions"] });
        },
    });

    const deleteBudget = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM budgets WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    });

    const budgets = budgetQuery.data ?? [];

    // Separate regular and special budgets
    const regularBudgets = budgets.filter(b => !b.is_special);
    const specialBudgets = budgets.filter(b => b.is_special);

    // Regular goals
    const savingsGoals = regularBudgets.filter(b => b.type === "savings");
    const budgetGoals = regularBudgets.filter(b => b.type === "budget");

    // Special goals
    const specialSavingsGoals = specialBudgets.filter(b => b.type === "savings");
    const specialBudgetGoals = specialBudgets.filter(b => b.type === "budget");

    const savingsTransactions = savingsTransactionsQuery.data ?? [];

    // Calculate total savings (regular only)
    const totalSavings = savingsGoals.reduce((sum, s) => sum + s.current_amount, 0);

    // Calculate special savings
    const totalSpecialSavings = specialSavingsGoals.reduce((sum, s) => sum + s.current_amount, 0);

    // Calculate budget remaining for a specific budget
    const getBudgetRemaining = (budget: Budget): number => {
        if (budget.type !== "budget") return 0;

        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        // Use start_date if provided (user selected specific month/year)
        if (budget.start_date) {
            // Parse YYYY-MM-DD without timezone issues
            const [year, month] = budget.start_date.split('-').map(Number);
            const budgetStart = new Date(year, month - 1, 1); // month is 0-indexed

            switch (budget.period) {
                case "weekly": {
                    startDate = budgetStart;
                    endDate = new Date(budgetStart);
                    endDate.setDate(endDate.getDate() + 6);
                    break;
                }
                case "monthly": {
                    startDate = new Date(year, month - 1, 1);
                    endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month
                    break;
                }
                case "yearly": {
                    startDate = new Date(year, 0, 1);
                    endDate = new Date(year, 11, 31, 23, 59, 59);
                    break;
                }
                default:
                    startDate = budgetStart;
                    endDate = now;
            }
        } else {
            // Default behavior: current period
            endDate = now;
            switch (budget.period) {
                case "weekly": {
                    const dayOfWeek = now.getDay();
                    const daysFromSaturday = (dayOfWeek + 1) % 7;
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - daysFromSaturday);
                    startDate.setHours(0, 0, 0, 0);
                    break;
                }
                case "monthly": {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                }
                case "yearly": {
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                }
                default:
                    startDate = new Date(0);
            }
        }

        // Filter expenses for this period and category
        const periodExpenses = expenses.filter(e => {
            const expenseDate = new Date(e.date);
            if (expenseDate < startDate || expenseDate > endDate) return false;
            if (budget.category && e.category !== budget.category) return false;
            return true;
        });

        const spent = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
        return budget.target_amount - spent;
    };

    // Get the primary monthly budget (first monthly budget or highest target)
    const primaryBudget = budgetGoals.find(b => b.period === "monthly") || budgetGoals[0];
    const budgetRemaining = primaryBudget ? getBudgetRemaining(primaryBudget) : 0;

    return {
        budgets,
        regularBudgets,
        specialBudgets,
        savingsGoals,
        budgetGoals,
        specialSavingsGoals,
        specialBudgetGoals,
        totalSavings,
        totalSpecialSavings,
        budgetRemaining,
        primaryBudget,
        getBudgetRemaining,
        isLoading: budgetQuery.isLoading,
        error: budgetQuery.error,
        addBudget,
        updateBudget,
        addToSavings,
        deleteBudget,
        savingsTransactions,
        deleteSavingsTransaction,
        updateSavingsTransaction,
    };
}

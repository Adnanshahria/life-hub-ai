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

    const addBudget = useMutation({
        mutationFn: async (budget: {
            name: string;
            type: "budget" | "savings";
            target_amount: number;
            period?: "monthly" | "weekly" | "yearly" | null;
            category?: string | null;
            start_date?: string | null;
        }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            await db.execute({
                sql: "INSERT INTO budgets (id, user_id, name, type, target_amount, current_amount, period, category, start_date) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)",
                args: [id, userId, budget.name, budget.type, budget.target_amount, budget.period || null, budget.category || null, budget.start_date || null],
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
        }) => {
            const updates: string[] = [];
            const args: (string | number | null)[] = [];

            if (budget.name) { updates.push("name = ?"); args.push(budget.name); }
            if (budget.target_amount !== undefined) { updates.push("target_amount = ?"); args.push(budget.target_amount); }
            if (budget.current_amount !== undefined) { updates.push("current_amount = ?"); args.push(budget.current_amount); }
            if (budget.period !== undefined) { updates.push("period = ?"); args.push(budget.period); }
            if (budget.category !== undefined) { updates.push("category = ?"); args.push(budget.category); }
            if (budget.start_date !== undefined) { updates.push("start_date = ?"); args.push(budget.start_date); }

            if (updates.length === 0) return;
            args.push(budget.id);
            await db.execute({
                sql: `UPDATE budgets SET ${updates.join(", ")} WHERE id = ?`,
                args
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    });

    const addToSavings = useMutation({
        mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
            await db.execute({
                sql: "UPDATE budgets SET current_amount = current_amount + ? WHERE id = ?",
                args: [amount, id],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    });

    const deleteBudget = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM budgets WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    });

    const budgets = budgetQuery.data ?? [];
    const savingsGoals = budgets.filter(b => b.type === "savings");
    const budgetGoals = budgets.filter(b => b.type === "budget");

    // Calculate total savings
    const totalSavings = savingsGoals.reduce((sum, s) => sum + s.current_amount, 0);

    // Calculate budget remaining for a specific budget
    const getBudgetRemaining = (budget: Budget): number => {
        if (budget.type !== "budget") return 0;

        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

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
        savingsGoals,
        budgetGoals,
        totalSavings,
        budgetRemaining,
        primaryBudget,
        getBudgetRemaining,
        isLoading: budgetQuery.isLoading,
        error: budgetQuery.error,
        addBudget,
        updateBudget,
        addToSavings,
        deleteBudget,
    };
}

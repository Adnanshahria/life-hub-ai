import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export interface FinanceEntry {
    id: string;
    user_id: string;
    type: "income" | "expense";
    amount: number;
    category: string;
    description?: string;
    date: string;
}

export function useFinance() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const financeQuery = useQuery({
        queryKey: ["finance", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM finance WHERE user_id = ? ORDER BY date DESC",
                args: [userId],
            });
            return result.rows as unknown as FinanceEntry[];
        },
        enabled: !!userId,
    });

    const addEntry = useMutation({
        mutationFn: async (entry: Omit<FinanceEntry, "id" | "user_id"> & { date?: string }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            const date = entry.date ? new Date(entry.date).toISOString() : new Date().toISOString();
            await db.execute({
                sql: "INSERT INTO finance (id, user_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                args: [id, userId, entry.type, entry.amount, entry.category, entry.description || null, date],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
    });

    const deleteEntry = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM finance WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
    });

    const entries = financeQuery.data ?? [];
    const expenses = entries.filter((e) => e.type === "expense");
    const incomes = entries.filter((e) => e.type === "income");

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

    return {
        entries,
        expenses,
        incomes,
        totalExpenses,
        totalIncome,
        balance,
        expensesByCategory,
        isLoading: financeQuery.isLoading,
        error: financeQuery.error,
        addEntry,
        deleteEntry,
    };
}

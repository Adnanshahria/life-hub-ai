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
        mutationFn: async (entry: { type: "income" | "expense"; amount: number; category: string; description?: string; date?: string }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            // Parse date properly - if date-only string (YYYY-MM-DD), treat as local time
            let date: string;
            if (entry.date) {
                // If it's a date-only format (YYYY-MM-DD), append T00:00:00 to treat as local time
                if (/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
                    date = new Date(entry.date + "T12:00:00").toISOString(); // Use noon to avoid timezone issues
                } else {
                    date = new Date(entry.date).toISOString();
                }
            } else {
                date = new Date().toISOString();
            }
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

    const updateEntry = useMutation({
        mutationFn: async (entry: { id: string; type?: "income" | "expense"; amount?: number; category?: string; description?: string; date?: string }) => {
            const updates: string[] = [];
            const args: (string | number | null)[] = [];

            if (entry.type) { updates.push("type = ?"); args.push(entry.type); }
            if (entry.amount !== undefined) { updates.push("amount = ?"); args.push(entry.amount); }
            if (entry.category) { updates.push("category = ?"); args.push(entry.category); }
            if (entry.description !== undefined) { updates.push("description = ?"); args.push(entry.description || null); }
            if (entry.date) {
                let date: string;
                if (/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
                    date = new Date(entry.date + "T12:00:00").toISOString();
                } else {
                    date = new Date(entry.date).toISOString();
                }
                updates.push("date = ?");
                args.push(date);
            }

            if (updates.length === 0) return;
            args.push(entry.id);
            await db.execute({
                sql: `UPDATE finance SET ${updates.join(", ")} WHERE id = ?`,
                args
            });
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
        updateEntry,
    };
}

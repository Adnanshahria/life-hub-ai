import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export interface Task {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    status: "todo" | "in-progress" | "done";
    priority: "low" | "medium" | "high" | "urgent";
    due_date?: string;
    created_at: string;
    completed_at?: string;
    context_type?: "general" | "study" | "finance" | "habit" | "project" | "inventory";
    context_id?: string;
    budget_id?: string;
    expected_cost?: number;
    finance_type?: "income" | "expense";
    start_time?: string;
    end_time?: string;
    estimated_duration?: number;
    actual_duration?: number;
    recurrence_rule?: string;
    parent_task_id?: string;
    order_index?: number;
    labels?: string;
    reminder_time?: string;
    is_pinned?: boolean;
}

const ALL_TASK_FIELDS = [
    "title", "description", "status", "priority", "due_date", "completed_at",
    "context_type", "context_id", "budget_id", "expected_cost", "finance_type",
    "start_time", "end_time", "estimated_duration", "actual_duration",
    "recurrence_rule", "parent_task_id", "order_index", "labels",
    "reminder_time", "is_pinned"
];

export function useTasks() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const tasksQuery = useQuery({
        queryKey: ["tasks", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM tasks WHERE user_id = ? AND (parent_task_id IS NULL OR parent_task_id = '') ORDER BY order_index ASC, created_at DESC",
                args: [userId],
            });
            return result.rows as unknown as Task[];
        },
        enabled: !!userId,
    });

    const addTask = useMutation({
        mutationFn: async (task: Partial<Omit<Task, "id" | "user_id" | "created_at">>) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();

            const fields: string[] = ["id", "user_id"];
            const values: (string | number | null)[] = [id, userId];

            ALL_TASK_FIELDS.forEach(field => {
                const value = task[field as keyof typeof task];
                if (value !== undefined) {
                    fields.push(field);
                    values.push(value as string | number | null);
                }
            });

            // Set defaults
            if (!task.status) { fields.push("status"); values.push("todo"); }
            if (!task.priority) { fields.push("priority"); values.push("medium"); }

            const placeholders = fields.map(() => "?").join(", ");
            await db.execute({
                sql: `INSERT INTO tasks (${fields.join(", ")}) VALUES (${placeholders})`,
                args: values,
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    });

    const updateTask = useMutation({
        mutationFn: async (task: Partial<Task> & { id: string }) => {
            const fields: string[] = [];
            const args: (string | number | null)[] = [];

            ALL_TASK_FIELDS.forEach(field => {
                if (task[field as keyof Task] !== undefined) {
                    fields.push(`${field} = ?`);
                    args.push(task[field as keyof Task] as string | number | null);
                }
            });

            if (fields.length > 0) {
                args.push(task.id);
                await db.execute({
                    sql: `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
                    args,
                });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    });

    const deleteTask = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM tasks WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    });

    const completeTask = useMutation({
        mutationFn: async (id: string) => {
            const now = new Date().toISOString();

            // First, get the task to check if we need to create a finance entry
            const taskResult = await db.execute({
                sql: "SELECT * FROM tasks WHERE id = ?",
                args: [id],
            });
            const task = taskResult.rows[0] as unknown as Task;

            // Debug logging
            console.log("CompleteTask - Task data:", {
                id: task?.id,
                title: task?.title,
                context_type: task?.context_type,
                expected_cost: task?.expected_cost,
                finance_type: task?.finance_type,
                condition: task && task.context_type === "finance" && task.expected_cost && task.expected_cost > 0
            });

            // Update task status
            await db.execute({
                sql: "UPDATE tasks SET status = 'done', completed_at = ? WHERE id = ?",
                args: [now, id],
            });

            // If task has finance context and expected_cost, create a finance entry
            if (task && task.context_type === "finance" && task.expected_cost && task.expected_cost > 0) {
                const financeId = generateId();
                const financeType = task.finance_type || "expense"; // Default to expense if not specified
                // Use completion date (today) with LOCAL timezone, not UTC
                const localNow = new Date();
                const todayDate = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;

                console.log("Creating finance entry:", { financeId, financeType, amount: task.expected_cost, date: todayDate });

                await db.execute({
                    sql: "INSERT INTO finance (id, user_id, type, amount, category, description, date, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [
                        financeId,
                        task.user_id,
                        financeType,
                        task.expected_cost,
                        task.title, // Use task title as category
                        task.description || `From task: ${task.title}`,
                        todayDate + "T12:00:00.000Z",
                        0 // Not special by default
                    ],
                });

                // If income task is linked to a savings goal, add to that savings
                if (financeType === "income" && task.context_id) {
                    console.log("Adding income to savings goal:", task.context_id, task.expected_cost);
                    await db.execute({
                        sql: "UPDATE budget SET current_amount = COALESCE(current_amount, 0) + ? WHERE id = ?",
                        args: [task.expected_cost, task.context_id],
                    });
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["finance"] }); // Also refresh finance data
            queryClient.invalidateQueries({ queryKey: ["budgets"] }); // Also refresh budgets/savings
        },
    });

    // Get tasks by context (e.g., all tasks linked to a study chapter)
    const getTasksByContext = async (contextType: string, contextId: string) => {
        if (!userId) return [];
        const result = await db.execute({
            sql: "SELECT * FROM tasks WHERE user_id = ? AND context_type = ? AND context_id = ? ORDER BY created_at DESC",
            args: [userId, contextType, contextId],
        });
        return result.rows as unknown as Task[];
    };

    // Get subtasks for a parent task
    const getSubtasks = async (parentTaskId: string) => {
        if (!userId) return [];
        const result = await db.execute({
            sql: "SELECT * FROM tasks WHERE user_id = ? AND parent_task_id = ? ORDER BY order_index ASC",
            args: [userId, parentTaskId],
        });
        return result.rows as unknown as Task[];
    };

    return {
        tasks: tasksQuery.data ?? [],
        isLoading: tasksQuery.isLoading,
        error: tasksQuery.error,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        getTasksByContext,
        getSubtasks,
    };
}


// AI Intent and Chat types

export interface AIIntent {
    action: string;
    data: Record<string, unknown>;
    response_text: string;
}

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface GroqResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
}

// Module interface that each feature module must implement
export interface AIModule {
    name: string;
    actions: string[];
    prompt: string;
    execute: (action: string, data: Record<string, unknown>, hooks: unknown) => Promise<void>;
}

// Hook types for each module
export interface FinanceHooks {
    addEntry: { mutateAsync: (data: unknown) => Promise<void> };
    deleteEntry: { mutateAsync: (id: string) => Promise<void> };
    updateEntry: { mutateAsync: (data: unknown) => Promise<void> };
    addBudget: { mutateAsync: (data: unknown) => Promise<void> };
    updateBudget: { mutateAsync: (data: unknown) => Promise<void> };
    deleteBudget: { mutateAsync: (id: string) => Promise<void> };
    addToSavings: { mutateAsync: (data: unknown) => Promise<void> };
    entries: Array<{ id: string; type: string; amount: number; category: string; description?: string; is_special?: boolean }>;
    expenses: Array<{ id: string; amount: number; category: string; description?: string }>;
    budgets: Array<{ id: string; name: string; type: string }>;
    savingsGoals: Array<{ id: string; name: string }>;
}

export interface TaskHooks {
    addTask: { mutateAsync: (data: unknown) => Promise<void> };
    updateTask: { mutateAsync: (data: unknown) => Promise<void> };
    deleteTask: { mutateAsync: (id: string) => Promise<void> };
    completeTask: { mutateAsync: (id: string) => Promise<void> };
    tasks: Array<{
        id: string;
        title: string;
        description?: string;
        status: "todo" | "in-progress" | "done";
        priority: "low" | "medium" | "high" | "urgent";
        due_date?: string;
        context_type?: "general" | "study" | "finance" | "habit" | "project";
        context_id?: string;
        budget_id?: string;
        expected_cost?: number;
        finance_type?: "income" | "expense";
        start_time?: string;
        end_time?: string;
        estimated_duration?: number;
        is_pinned?: boolean;
    }>;
}

export interface NoteHooks {
    addNote: { mutateAsync: (data: unknown) => Promise<void> };
    deleteNote: { mutateAsync: (id: string) => Promise<void> };
    notes: Array<{ id: string; title: string }>;
}

export interface HabitHooks {
    addHabit: { mutateAsync: (data: unknown) => Promise<void> };
    completeHabit: { mutateAsync: (id: string) => Promise<void> };
    deleteHabit: { mutateAsync: (id: string) => Promise<void> };
    habits: Array<{ id: string; name: string }>;
}

export interface StudyHooks {
    addChapter: { mutateAsync: (data: unknown) => Promise<void> };
    updateProgress: { mutateAsync: (data: unknown) => Promise<void> };
    deleteChapter: { mutateAsync: (id: string) => Promise<void> };
    chapters: Array<{ id: string; title: string }>;
}

export interface InventoryHooks {
    addItem: { mutateAsync: (data: unknown) => Promise<void> };
    updateItem: { mutateAsync: (data: unknown) => Promise<void> };
    deleteItem: { mutateAsync: (id: string) => Promise<void> };
    items: Array<{
        id: string;
        item_name: string;
        category?: string;
        quantity: number;
        status: string;
        cost?: number;
    }>;
}

export interface AllHooks {
    finance: FinanceHooks;
    tasks: TaskHooks;
    notes: NoteHooks;
    habits: HabitHooks;
    study: StudyHooks;
    inventory: InventoryHooks;
}

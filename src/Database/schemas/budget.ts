import { db } from "../client";

export const budgetSchema = `
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('budget', 'savings')),
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    period TEXT CHECK(period IN ('monthly', 'weekly', 'yearly') OR period IS NULL),
    category TEXT,
    start_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`;

export async function initBudgetTable() {
    await db.execute(budgetSchema);
}

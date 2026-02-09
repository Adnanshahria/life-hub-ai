import { db } from "../client";

export const inventorySchema = `
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 1,
    cost REAL,
    purchase_date TEXT,
    store TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    warranty_expiry TEXT,
    finance_entry_id TEXT
)
`;

export async function initInventoryTable() {
    await db.execute(inventorySchema);
    // Migrations for new columns
    try {
        await db.execute("ALTER TABLE inventory ADD COLUMN category TEXT");
        await db.execute("ALTER TABLE inventory ADD COLUMN quantity INTEGER DEFAULT 1");
        await db.execute("ALTER TABLE inventory ADD COLUMN notes TEXT");
        await db.execute("ALTER TABLE inventory ADD COLUMN status TEXT DEFAULT 'active'");
        await db.execute("ALTER TABLE inventory ADD COLUMN warranty_expiry TEXT");
        await db.execute("ALTER TABLE inventory ADD COLUMN finance_entry_id TEXT");
    } catch (e) {
        // Ignore errors if columns already exist
        console.log("Migration: Columns might already exist");
    }
}

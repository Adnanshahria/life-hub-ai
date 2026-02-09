import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export interface InventoryItem {
    id: string;
    user_id: string;
    item_name: string;
    category?: string;
    quantity: number;
    cost?: number;
    purchase_date?: string;
    store?: string;
    notes?: string;
    status: "active" | "sold" | "disposed" | "lost";
    warranty_expiry?: string;
    finance_entry_id?: string;
}

export function useInventory() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const inventoryQuery = useQuery({
        queryKey: ["inventory", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM inventory WHERE user_id = ? ORDER BY purchase_date DESC, item_name",
                args: [userId],
            });
            return result.rows as unknown as InventoryItem[];
        },
        enabled: !!userId,
    });

    const addItem = useMutation({
        mutationFn: async (item: Omit<InventoryItem, "id" | "user_id" | "finance_entry_id"> & { record_purchase?: boolean, finance_category?: string }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            let financeId = null;

            // Auto-create finance expense if requested
            if (item.record_purchase && item.cost && item.cost > 0) {
                financeId = generateId();
                await db.execute({
                    sql: "INSERT INTO finance (id, user_id, type, amount, category, description, date) VALUES (?, ?, 'expense', ?, ?, ?, ?)",
                    args: [
                        financeId,
                        userId,
                        item.cost,
                        item.finance_category || "Shopping",
                        `Purchase: ${item.item_name}`,
                        item.purchase_date || new Date().toISOString()
                    ]
                });
            }

            await db.execute({
                sql: `INSERT INTO inventory (
                    id, user_id, item_name, category, quantity, cost, purchase_date, store, 
                    notes, status, warranty_expiry, finance_entry_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    id, userId, item.item_name, item.category || null, item.quantity || 1,
                    item.cost || null, item.purchase_date || null, item.store || null,
                    item.notes || null, item.status || 'active', item.warranty_expiry || null, financeId
                ],
            });
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            queryClient.invalidateQueries({ queryKey: ["finance"] }); // Refresh finance too
        },
    });

    const updateItem = useMutation({
        mutationFn: async (item: InventoryItem) => {
            await db.execute({
                sql: `UPDATE inventory SET 
                    item_name = ?, category = ?, quantity = ?, cost = ?, purchase_date = ?, 
                    store = ?, notes = ?, status = ?, warranty_expiry = ? 
                    WHERE id = ?`,
                args: [
                    item.item_name, item.category || null, item.quantity, item.cost || null,
                    item.purchase_date || null, item.store || null, item.notes || null,
                    item.status, item.warranty_expiry || null, item.id
                ],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    });

    const markAsSold = useMutation({
        mutationFn: async ({ id, salePrice, saleDate }: { id: string, salePrice: number, saleDate: string }) => {
            if (!userId) throw new Error("Not authenticated");

            // 1. Update Inventory Item
            await db.execute({
                sql: "UPDATE inventory SET status = 'sold' WHERE id = ?",
                args: [id]
            });

            // 2. Add Income Entry to Finance
            if (salePrice > 0) {
                const financeId = generateId();
                // Get item name for description
                const item = inventoryQuery.data?.find(i => i.id === id);
                const description = item ? `Sold: ${item.item_name}` : "Sold Inventory Item";

                await db.execute({
                    sql: "INSERT INTO finance (id, user_id, type, amount, category, description, date) VALUES (?, ?, 'income', ?, 'Sales', ?, ?)",
                    args: [financeId, userId, salePrice, description, saleDate]
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            queryClient.invalidateQueries({ queryKey: ["finance"] });
        },
    });

    const deleteItem = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM inventory WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    });

    const totalValue = (inventoryQuery.data ?? []).reduce((sum, item) => sum + (item.cost || 0), 0);

    return {
        items: inventoryQuery.data ?? [],
        totalValue,
        isLoading: inventoryQuery.isLoading,
        error: inventoryQuery.error,
        addItem,
        updateItem,
        deleteItem,
        markAsSold,
    };
}

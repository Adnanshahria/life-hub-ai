// Inventory AI Module - handles inventory item actions

import { AIModule, InventoryHooks } from '../core/types';

export const INVENTORY_ACTIONS = [
    "ADD_INVENTORY_ITEM",
    "DELETE_INVENTORY_ITEM",
];

export const INVENTORY_PROMPT = `INVENTORY RULES:
For ADD_INVENTORY_ITEM, data must include: name (string), quantity (optional number), category (optional string)
For DELETE_INVENTORY_ITEM, data must include: id or name

Inventory Examples:
- "add item laptop to inventory" → ADD_INVENTORY_ITEM with name "Laptop"
- "I have 3 notebooks" → ADD_INVENTORY_ITEM with name "Notebooks", quantity 3
- "remove laptop from inventory" → DELETE_INVENTORY_ITEM with name "laptop"`;

export async function executeInventoryAction(
    action: string,
    data: Record<string, unknown>,
    hooks: InventoryHooks
): Promise<void> {
    switch (action) {
        case "ADD_INVENTORY_ITEM":
            await hooks.addItem.mutateAsync({
                name: String(data.name),
                quantity: data.quantity ? Number(data.quantity) : 1,
                category: data.category ? String(data.category) : null,
            });
            break;

        case "DELETE_INVENTORY_ITEM": {
            const itemToDelete = hooks.items?.find(i =>
                i.name.toLowerCase().includes((data.name as string || data.id as string || "").toLowerCase())
            );
            if (itemToDelete) await hooks.deleteItem.mutateAsync(itemToDelete.id);
            break;
        }
    }
}

export const inventoryModule: AIModule = {
    name: "inventory",
    actions: INVENTORY_ACTIONS,
    prompt: INVENTORY_PROMPT,
    execute: executeInventoryAction as AIModule['execute'],
};

// Habits AI Module - handles habit actions

import { AIModule, HabitHooks } from '../core/types';

export const HABIT_ACTIONS = [
    "ADD_HABIT",
    "COMPLETE_HABIT",
    "DELETE_HABIT",
];

export const HABIT_PROMPT = `HABIT RULES:
For ADD_HABIT, data must include: name (string), frequency (optional: 'daily'/'weekly')
For COMPLETE_HABIT, data must include: id or name
For DELETE_HABIT, data must include: id or name

Habit Examples:
- "add habit drink water" → ADD_HABIT with name "Drink water", frequency "daily"
- "I did my exercise today" → COMPLETE_HABIT with name "exercise"
- "mark meditation done" → COMPLETE_HABIT with name "meditation"
- "delete the reading habit" → DELETE_HABIT with name "reading"`;

export async function executeHabitAction(
    action: string,
    data: Record<string, unknown>,
    hooks: HabitHooks
): Promise<void> {
    switch (action) {
        case "ADD_HABIT":
            await hooks.addHabit.mutateAsync({
                name: String(data.name),
                frequency: data.frequency ? String(data.frequency) : "daily",
            });
            break;

        case "COMPLETE_HABIT": {
            const habitToComplete = hooks.habits?.find(h =>
                h.name.toLowerCase().includes((data.name as string || data.id as string || "").toLowerCase())
            );
            if (habitToComplete) await hooks.completeHabit.mutateAsync(habitToComplete.id);
            break;
        }

        case "DELETE_HABIT": {
            const habitToDelete = hooks.habits?.find(h =>
                h.name.toLowerCase().includes((data.name as string || data.id as string || "").toLowerCase())
            );
            if (habitToDelete) await hooks.deleteHabit.mutateAsync(habitToDelete.id);
            break;
        }
    }
}

export const habitsModule: AIModule = {
    name: "habits",
    actions: HABIT_ACTIONS,
    prompt: HABIT_PROMPT,
    execute: executeHabitAction as AIModule['execute'],
};

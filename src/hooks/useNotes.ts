import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export type NoteColor =
    | "default"
    | "coral"
    | "peach"
    | "sand"
    | "mint"
    | "sage"
    | "fog"
    | "storm"
    | "dusk"
    | "blossom"
    | "clay"
    | "chalk";

export const NOTE_COLORS: Record<NoteColor, { light: string; dark: string; label: string }> = {
    default: { light: "bg-white", dark: "dark:bg-secondary/40", label: "Default" },
    coral: { light: "bg-red-100", dark: "dark:bg-red-500/15 dark:border-red-500/20", label: "Coral" },
    peach: { light: "bg-orange-100", dark: "dark:bg-orange-500/15 dark:border-orange-500/20", label: "Peach" },
    sand: { light: "bg-yellow-100", dark: "dark:bg-yellow-500/15 dark:border-yellow-500/20", label: "Sand" },
    mint: { light: "bg-green-100", dark: "dark:bg-green-500/15 dark:border-green-500/20", label: "Mint" },
    sage: { light: "bg-teal-100", dark: "dark:bg-teal-500/15 dark:border-teal-500/20", label: "Sage" },
    fog: { light: "bg-gray-100", dark: "dark:bg-gray-500/15 dark:border-gray-500/20", label: "Fog" },
    storm: { light: "bg-blue-100", dark: "dark:bg-blue-500/15 dark:border-blue-500/20", label: "Storm" },
    dusk: { light: "bg-indigo-100", dark: "dark:bg-indigo-500/15 dark:border-indigo-500/20", label: "Dusk" },
    blossom: { light: "bg-purple-100", dark: "dark:bg-purple-500/15 dark:border-purple-500/20", label: "Blossom" },
    clay: { light: "bg-amber-100", dark: "dark:bg-amber-500/15 dark:border-amber-500/20", label: "Clay" },
    chalk: { light: "bg-stone-100", dark: "dark:bg-stone-500/15 dark:border-stone-500/20", label: "Chalk" },
};

export interface Note {
    id: string;
    user_id: string;
    title: string;
    content?: string;
    tags?: string;
    is_pinned: number;
    color: NoteColor;
    is_archived: number;
    is_trashed: number;
    updated_at: string;
    created_at: string;
    serial_number: number;
}

export function useNotes() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const notesQuery = useQuery({
        queryKey: ["notes", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC",
                args: [userId],
            });
            return (result.rows as unknown as Note[]).map(n => ({
                ...n,
                is_pinned: n.is_pinned ?? 0,
                color: (n.color as NoteColor) || "default",
                is_archived: n.is_archived ?? 0,
                is_trashed: n.is_trashed ?? 0,
                updated_at: n.updated_at || n.created_at,
                // Ensure serial_number is treated as number
                serial_number: Number(n.serial_number) || 0,
            }));
        },
        enabled: !!userId,
    });

    const addNote = useMutation({
        mutationFn: async (note: { title: string; content?: string; tags?: string; color?: NoteColor }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            const now = new Date().toISOString();

            // Get next serial number for this user
            const serialKey = `last_serial_${userId}`;

            // Initialize sequence for this user if accessing for first time
            await db.execute({
                sql: `INSERT OR IGNORE INTO note_metadata (key, value) 
                      SELECT ?, COALESCE(MAX(serial_number), 0) FROM notes WHERE user_id = ?`,
                args: [serialKey, userId],
            });

            await db.execute({
                sql: "UPDATE note_metadata SET value = value + 1 WHERE key = ?",
                args: [serialKey],
            });

            const serialResult = await db.execute({
                sql: "SELECT value FROM note_metadata WHERE key = ?",
                args: [serialKey],
            });

            const serial = serialResult.rows[0]?.value ? Number(serialResult.rows[0].value) : 1;

            await db.execute({
                sql: "INSERT INTO notes (id, user_id, title, content, tags, color, updated_at, serial_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                args: [id, userId, note.title, note.content || null, note.tags || null, note.color || "default", now, serial],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    const updateNote = useMutation({
        mutationFn: async (note: Partial<Note> & { id: string }) => {
            const now = new Date().toISOString();
            await db.execute({
                sql: "UPDATE notes SET title = COALESCE(?, title), content = COALESCE(?, content), tags = COALESCE(?, tags), color = COALESCE(?, color), is_pinned = COALESCE(?, is_pinned), is_archived = COALESCE(?, is_archived), is_trashed = COALESCE(?, is_trashed), updated_at = ? WHERE id = ?",
                args: [
                    note.title ?? null,
                    note.content ?? null,
                    note.tags ?? null,
                    note.color ?? null,
                    note.is_pinned ?? null,
                    note.is_archived ?? null,
                    note.is_trashed ?? null,
                    now,
                    note.id,
                ],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    const togglePin = useMutation({
        mutationFn: async (note: Note) => {
            const newVal = note.is_pinned ? 0 : 1;
            await db.execute({
                sql: "UPDATE notes SET is_pinned = ? WHERE id = ?",
                args: [newVal, note.id],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    const updateColor = useMutation({
        mutationFn: async ({ id, color }: { id: string; color: NoteColor }) => {
            await db.execute({
                sql: "UPDATE notes SET color = ? WHERE id = ?",
                args: [color, id],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    const archiveNote = useMutation({
        mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
            await db.execute({
                sql: "UPDATE notes SET is_archived = ? WHERE id = ?",
                args: [archive ? 1 : 0, id],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    const trashNote = useMutation({
        mutationFn: async ({ id, trash }: { id: string; trash: boolean }) => {
            await db.execute({
                sql: "UPDATE notes SET is_trashed = ? WHERE id = ?",
                args: [trash ? 1 : 0, id],
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    const deleteNote = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM notes WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    return {
        notes: notesQuery.data ?? [],
        isLoading: notesQuery.isLoading,
        error: notesQuery.error,
        addNote,
        updateNote,
        togglePin,
        updateColor,
        archiveNote,
        trashNote,
        deleteNote,
    };
}

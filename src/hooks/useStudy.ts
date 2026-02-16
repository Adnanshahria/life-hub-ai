import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, generateId } from "@/lib/turso";
import { useAuth } from "@/contexts/AuthContext";

export interface StudyChapter {
    id: string;
    user_id: string;
    subject: string;
    chapter_name: string;
    progress_percentage: number;
    status: "not-started" | "in-progress" | "completed";
    last_studied_at?: string;
    review_due_at?: string;
    mastery_level?: number;
    resources?: string; // JSON string of Resource[]
}

export interface Resource {
    id: string;
    title: string;
    url: string;
    type: "video" | "doc" | "link";
}

export function useStudy() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    const chaptersQuery = useQuery<StudyChapter[]>({
        queryKey: ["study_chapters", userId],
        queryFn: async (): Promise<StudyChapter[]> => {
            if (!userId) return [];
            const result = await db.execute({
                sql: "SELECT * FROM study_chapters WHERE user_id = ? ORDER BY subject, chapter_name",
                args: [userId],
            });
            return result.rows as unknown as StudyChapter[];
        },
        enabled: !!userId,
    });

    const addChapter = useMutation({
        mutationFn: async (chapter: { subject: string; chapter_name: string }) => {
            if (!userId) throw new Error("Not authenticated");
            const id = generateId();
            await db.execute({
                sql: "INSERT INTO study_chapters (id, user_id, subject, chapter_name, progress_percentage, status) VALUES (?, ?, ?, ?, 0, 'not-started')",
                args: [id, userId, chapter.subject, chapter.chapter_name],
            });
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study_chapters"] }),
    });

    const updateProgress = useMutation({
        mutationFn: async ({ id, progress_percentage, mastery_rating }: { id: string; progress_percentage: number, mastery_rating?: number }) => {
            const status = progress_percentage >= 100 ? "completed" : progress_percentage > 0 ? "in-progress" : "not-started";

            // SRS Logic
            let reviewDue = null;
            let mastery = undefined;

            if (mastery_rating !== undefined) {
                mastery = mastery_rating; // 1 (Hard) to 5 (Easy)
                const daysToAdd = mastery === 1 ? 1 : mastery === 2 ? 3 : mastery === 3 ? 7 : mastery === 4 ? 14 : 30;
                const date = new Date();
                date.setDate(date.getDate() + daysToAdd);
                reviewDue = date.toISOString();
            }

            // Construct SQL dynamically based on whether SRS data is provided
            let sql = "UPDATE study_chapters SET progress_percentage = ?, status = ?, last_studied_at = ?";
            const args: any[] = [Math.min(100, Math.max(0, progress_percentage)), status, new Date().toISOString()];

            if (reviewDue) {
                sql += ", review_due_at = ?, mastery_level = ?";
                args.push(reviewDue, mastery);
            }

            sql += " WHERE id = ?";
            args.push(id);

            await db.execute({ sql, args });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study_chapters"] }),
    });

    const deleteChapter = useMutation({
        mutationFn: async (id: string) => {
            await db.execute({ sql: "DELETE FROM study_chapters WHERE id = ?", args: [id] });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study_chapters"] }),
    });

    // Group chapters by subject
    const chapters: StudyChapter[] = chaptersQuery.data ?? [];
    const subjects = Array.from(new Set(chapters.map((c: StudyChapter) => c.subject))) as string[];
    const chaptersBySubject: Record<string, StudyChapter[]> = subjects.reduce(
        (acc: Record<string, StudyChapter[]>, subject: string) => {
            acc[subject] = chapters.filter((c) => c.subject === subject);
            return acc;
        },
        {} as Record<string, StudyChapter[]>
    );

    // Calculate overall progress per subject
    const subjectProgress = subjects.map((subject: string) => {
        const subjectChapters = chaptersBySubject[subject];
        const avg = subjectChapters.reduce((sum: number, c: StudyChapter) => sum + c.progress_percentage, 0) / subjectChapters.length;
        return { subject, progress: Math.round(avg), chapters: subjectChapters.length };
    });

    return {
        chapters,
        subjects,
        chaptersBySubject,
        subjectProgress,
        isLoading: chaptersQuery.isLoading,
        error: chaptersQuery.error,
        addChapter,
        updateProgress,
        deleteChapter,
    };
}

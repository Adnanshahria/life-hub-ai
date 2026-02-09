// Study AI Module - handles study/chapter actions

import { AIModule, StudyHooks } from '../core/types';

export const STUDY_ACTIONS = [
    "ADD_STUDY_CHAPTER",
    "UPDATE_STUDY_PROGRESS",
    "DELETE_STUDY_CHAPTER",
];

export const STUDY_PROMPT = `STUDY RULES:
For ADD_STUDY_CHAPTER, data must include: title (string), subject (optional string), total_pages (optional number)
For UPDATE_STUDY_PROGRESS, data must include: id or title (to find chapter), pages_read (number)
For DELETE_STUDY_CHAPTER, data must include: id or title

Study Examples:
- "add chapter calculus from math book" → ADD_STUDY_CHAPTER with title "Calculus", subject "Math"
- "I read 20 pages of calculus" → UPDATE_STUDY_PROGRESS with title "calculus", pages_read 20
- "delete the physics chapter" → DELETE_STUDY_CHAPTER with title "physics"`;

export async function executeStudyAction(
    action: string,
    data: Record<string, unknown>,
    hooks: StudyHooks
): Promise<void> {
    switch (action) {
        case "ADD_STUDY_CHAPTER":
            await hooks.addChapter.mutateAsync({
                title: String(data.title),
                subject: data.subject ? String(data.subject) : null,
                total_pages: data.total_pages ? Number(data.total_pages) : null,
            });
            break;

        case "UPDATE_STUDY_PROGRESS": {
            const chapterToUpdate = hooks.chapters?.find(c =>
                c.title.toLowerCase().includes((data.title as string || data.id as string || "").toLowerCase())
            );
            if (chapterToUpdate) {
                await hooks.updateProgress.mutateAsync({
                    id: chapterToUpdate.id,
                    pages_read: Number(data.pages_read),
                });
            }
            break;
        }

        case "DELETE_STUDY_CHAPTER": {
            const chapterToDelete = hooks.chapters?.find(c =>
                c.title.toLowerCase().includes((data.title as string || data.id as string || "").toLowerCase())
            );
            if (chapterToDelete) await hooks.deleteChapter.mutateAsync(chapterToDelete.id);
            break;
        }
    }
}

export const studyModule: AIModule = {
    name: "study",
    actions: STUDY_ACTIONS,
    prompt: STUDY_PROMPT,
    execute: executeStudyAction as AIModule['execute'],
};

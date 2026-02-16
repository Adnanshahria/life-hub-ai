// Groq API Client

import { ChatMessage, GroqResponse, AIIntent } from './types';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function callGroqAPI(
    messages: ChatMessage[],
    options: {
        temperature?: number;
        maxTokens?: number;
    } = {}
): Promise<string> {
    const { temperature = 0.3, maxTokens = 1024 } = options;

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" }
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Groq API Error Body:", errorBody);
        throw new Error(`Groq API error: ${response.status} - ${errorBody}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || "{}";
}

// Parse AI response — supports both single and batch formats
export function parseAIResponse(content: string): AIIntent[] {
    try {
        const parsed = JSON.parse(content);

        // Batch format: { actions: [...], response_text: "..." }
        if (parsed.actions && Array.isArray(parsed.actions)) {
            const responseText = parsed.response_text || "Done!";
            return parsed.actions.map((a: any, i: number) => ({
                action: a.action || "CHAT",
                data: a.data || {},
                response_text: i === 0 ? responseText : "", // Only first intent carries the response text
            }));
        }

        // Single format: { action: "...", data: {...}, response_text: "..." }
        return [{
            action: parsed.action || "CHAT",
            data: parsed.data || {},
            response_text: parsed.response_text || "I'm not sure how to help with that.",
        }];
    } catch {
        return [{
            action: "CHAT",
            data: {},
            response_text: "Sorry, I had trouble understanding that. Could you try again?",
        }];
    }
}

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
    const { temperature = 0.3, maxTokens = 512 } = options;

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
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || "{}";
}

export function parseAIResponse(content: string): AIIntent {
    try {
        const parsed = JSON.parse(content);
        return {
            action: parsed.action || "CHAT",
            data: parsed.data || {},
            response_text: parsed.response_text || "I'm not sure how to help with that.",
        };
    } catch {
        return {
            action: "CHAT",
            data: {},
            response_text: "Sorry, I had trouble understanding that. Could you try again?",
        };
    }
}

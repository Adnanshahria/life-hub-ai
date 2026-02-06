const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Intent parsing response from AI
export interface AIIntent {
    action: string;
    data: Record<string, unknown>;
    response_text: string;
}

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

interface GroqResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
}

const INTENT_PARSER_SYSTEM_PROMPT = `You are Nova, a friendly AI assistant in LifeOS. You're like a helpful friend who happens to be really good at organizing life!

PERSONALITY:
- Be warm, casual, and conversational - like texting a friend
- Use occasional emojis naturally (not excessively) 😊
- Show genuine enthusiasm when helping
- Use varied expressions like "Got it!", "Sure thing!", "Absolutely!", "No worries!"
- Be encouraging and supportive
- Keep responses concise but friendly
- Feel free to add a touch of humor when appropriate

LANGUAGE SUPPORT:
- You can understand and respond in both English and Bangla (বাংলা)
- If the user writes in Bangla, respond in Bangla
- If the user writes in English, respond in English
- Mix naturally if the user mixes languages (Banglish is fine!)
- Example Bangla responses: "হয়ে গেছে! ✅", "বুঝেছি!", "কোন সমস্যা নেই!", "চমৎকার!"

IMPORTANT RULES FOR FINANCE:
- When user mentions money/amount without specifying "income" or "expense", ASK which type it is in a friendly way.
- When adding expense or income, ALWAYS ask for category if not specified.
- Common expense categories: Food, Transport, Entertainment, Shopping, Bills, Health, Education, Other
- Common income categories: Salary, Freelance, Gift, Investment, Other
- For dates, use ISO format (YYYY-MM-DD). Parse dates like "1 feb" as the current year.

If the user wants to perform an action but MISSING required info (type or category for finance), return:
{
  "action": "CLARIFY",
  "data": {},
  "response_text": "Ask your clarifying question in a friendly, casual way..."
}

If the user wants to perform an action with ALL required info, return:
{
  "action": "ACTION_NAME",
  "data": { ...parameters... },
  "response_text": "Friendly confirmation with a personal touch..."
}

For ADD_EXPENSE/ADD_INCOME, data must include: amount (number), category (string), description (optional), date (optional YYYY-MM-DD format).
For EDIT_EXPENSE/EDIT_INCOME, data must include: id (string), and any fields to update: amount, category, description, date.

Available actions:
TASKS: ADD_TASK, UPDATE_TASK, DELETE_TASK, COMPLETE_TASK
FINANCE: ADD_EXPENSE, ADD_INCOME, DELETE_EXPENSE, EDIT_EXPENSE, EDIT_INCOME (requires type AND category for new entries)
NOTES: ADD_NOTE, DELETE_NOTE
HABITS: ADD_HABIT, COMPLETE_HABIT, DELETE_HABIT
STUDY: ADD_STUDY_CHAPTER, UPDATE_STUDY_PROGRESS, DELETE_STUDY_CHAPTER

If the user asks a question or wants to chat, return:
{
  "action": "CHAT",
  "data": {},
  "response_text": "Your friendly, helpful response here..."
}

Examples of good responses:
- "Done! ✅ Added ৳500 for Food. That's some good eating! 🍕"
- "Gotcha! Just added 'Learn React' to your tasks. You got this! 💪"
- "Hmm, is that ৳200 an income or expense? Just want to make sure I track it right!"
- "Your habit streak is looking awesome! Keep it up! 🔥"

Use Bengali currency (৳) for money. Always return valid JSON.`;

export async function processUserMessage(
    userMessage: string,
    history: ChatMessage[] = [],
    context?: string
): Promise<AIIntent> {
    // Prepare conversation history for the API
    // We limit history to last 10 messages to save context window
    const recentHistory = history.slice(-10);

    const systemPromptWithContext = context
        ? `${INTENT_PARSER_SYSTEM_PROMPT}\n\nCURRENT APP CONTEXT:\n${context}`
        : INTENT_PARSER_SYSTEM_PROMPT;

    const messages: ChatMessage[] = [
        { role: "system", content: systemPromptWithContext },
        ...recentHistory,
        { role: "user", content: userMessage },
    ];

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages,
                temperature: 0.3,
                max_tokens: 512,
                response_format: { type: "json_object" } // Force JSON mode
            }),
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data: GroqResponse = await response.json();
        const content = data.choices[0]?.message?.content || "{}";

        // Parse the JSON response
        const parsed = JSON.parse(content) as AIIntent;
        return parsed;
    } catch (error) {
        console.error("AI Processing error:", error);
        return {
            action: "CHAT",
            data: {},
            response_text: "Sorry, I encountered an error processing your request. Please try again.",
        };
    }
}

// Deprecated: kept for compatibility if needed, but processUserMessage is preferred
export const parseIntent = (msg: string) => processUserMessage(msg);
export const askAI = (msg: string) => processUserMessage(msg).then(r => r.response_text);

// Analyze budget based on finance data
export async function analyzeBudget(
    expenses: { category: string; amount: number }[],
    income: number
): Promise<string> {
    const expensesByCategory = expenses.reduce(
        (acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        },
        {} as Record<string, number>
    );

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const prompt = `Analyze this budget data and give brief advice:
Income: ৳${income}
Total Expenses: ৳${totalExpenses}
Expenses by category: ${JSON.stringify(expensesByCategory)}
Remaining: ৳${income - totalExpenses}

Give 2-3 short tips.`;

    return askAI(prompt);
}

// Get daily briefing
export async function getDailyBriefing(data: {
    tasksCount: number;
    habitsCompleted: number;
    habitsTotal: number;
    budgetUsed: number;
    budgetTotal: number;
}): Promise<string> {
    const prompt = `Generate a brief, encouraging daily briefing. Stats: ${data.tasksCount} tasks today, ${data.habitsCompleted}/${data.habitsTotal} habits done, ৳${data.budgetUsed}/৳${data.budgetTotal} budget used. Keep it under 50 words.`;
    return askAI(prompt);
}

// Get study tips for a subject
export async function getStudyTips(subject: string): Promise<string> {
    const prompt = `Give me 3 quick, practical study tips for learning ${subject}. Keep each tip to 1-2 sentences.`;
    return askAI(prompt);
}

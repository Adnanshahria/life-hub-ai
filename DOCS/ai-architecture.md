# AI Module Architecture

## Overview
The AI system is organized into modular files under `src/ai/` for maintainability and scalability.

## Structure

```
src/ai/
├── core/
│   ├── index.ts           # Main orchestrator - routes actions to modules
│   ├── groq-client.ts     # Groq API client & request handling
│   ├── types.ts           # Shared types (AIIntent, ChatMessage, hooks)
│   └── personality.ts     # Nova personality & base prompts
│
└── modules/
    ├── finance.ts         # Expense, income, budget, savings actions
    ├── tasks.ts           # Task add, update, delete, complete
    ├── notes.ts           # Notes add, delete
    ├── habits.ts          # Habits add, complete, delete
    ├── study.ts           # Study chapters, progress tracking
    └── inventory.ts       # Inventory item management
```

## How It Works

1. **User sends message** → `processUserMessage()` in `core/index.ts`
2. **AI parses intent** → Returns `{ action, data, response_text }`
3. **Action routed** → `executeAction()` finds correct module
4. **Module executes** → Module's `execute()` function handles the action

## Adding New Modules

1. Create `src/ai/modules/[name].ts`
2. Export: `ACTIONS`, `PROMPT`, `execute()`, and `[name]Module`
3. Import and register in `core/index.ts`

## Nova's Smart Decision-Making

Nova is designed to be **proactive** and execute actions with minimal user input:

| Missing Info | Smart Default |
|--------------|---------------|
| Priority | `medium` |
| Due date | Today |
| Category | Inferred from context |
| Time | Reasonable estimates |

**Philosophy**: If 70% confident, execute immediately. Only ask for clarification when truly ambiguous.

## Key Exports

```typescript
import { 
  processUserMessage,  // Process user input
  executeAction,       // Execute parsed intent
  ChatMessage,         // Type for chat history
  AIIntent,           // Type for parsed actions
  AllHooks            // Type for all app hooks
} from '@/ai/core';
```

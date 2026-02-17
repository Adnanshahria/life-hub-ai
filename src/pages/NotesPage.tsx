import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, FileText, Trash2, Tag, Search, StickyNote, BookOpen, Clock,
    Pin, PinOff, CheckSquare, Eye, EyeOff, Bold, Italic, Heading,
    ChevronRight, ChevronDown, Calendar, AlertCircle, Sparkles, Filter,
    Check, List, ListChecks, Copy, Edit3, Loader2, Send, X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo/SEO";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useNotes, Note } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";
import { enhanceNoteWithAI } from "@/ai/notes/enhanceNote";

const TAG_COLORS = [
    "bg-violet-500/15 text-violet-400 border-violet-500/20",
    "bg-blue-500/15 text-blue-400 border-blue-500/20",
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    "bg-amber-500/15 text-amber-400 border-amber-500/20",
    "bg-rose-500/15 text-rose-400 border-rose-500/20",
    "bg-teal-500/15 text-teal-400 border-teal-500/20",
    "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    "bg-orange-500/15 text-orange-400 border-orange-500/20",
];

function getTagColor(tag: string) {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ===== CHECKLIST HELPERS =====
function toggleChecklistItem(content: string, index: number): string {
    const lines = content.split("\n");
    let checkIdx = 0;
    return lines.map(line => {
        const match = line.match(/^(\s*[-*]\s*\[)([ xX])(\]\s*.*)/);
        if (match) {
            if (checkIdx === index) {
                checkIdx++;
                const newState = match[2] === " " ? "x" : " ";
                return match[1] + newState + match[3];
            }
            checkIdx++;
        }
        return line;
    }).join("\n");
}

function getChecklistStats(content: string): { total: number; checked: number } | null {
    const total = (content.match(/\[[ xX]\]/g) || []).length;
    const checked = (content.match(/\[[xX]\]/g) || []).length;
    if (total === 0) return null;
    return { total, checked };
}

// ===== INTERACTIVE RICH VIEW =====
// This renders the note content with real checkboxes, bold, italic, lists etc.
function RichNoteView({ content, onToggleCheckbox }: { content: string; onToggleCheckbox?: (index: number) => void }) {
    const lines = content.split("\n");
    let checkIdx = 0;

    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                // Checklist items: render as real checkboxes
                const checkMatch = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)/);
                if (checkMatch) {
                    const idx = checkIdx++;
                    const checked = checkMatch[1] !== " ";
                    return (
                        <div key={i} className="flex items-start gap-3 py-1.5 group select-none">
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleCheckbox?.(idx);
                                }}
                                className={cn(
                                    "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0",
                                    checked
                                        ? "bg-primary border-primary shadow-lg shadow-primary/20"
                                        : "border-muted-foreground/30 hover:border-primary/50 bg-background"
                                )}
                            >
                                <AnimatePresence>
                                    {checked && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        >
                                            <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleCheckbox?.(idx);
                                }}
                                className={cn(
                                    "text-sm flex-1 cursor-pointer transition-all duration-300",
                                    checked ? "line-through text-muted-foreground/60 italic" : "text-foreground/90"
                                )}
                            >
                                {renderInlineFormatting(checkMatch[2])}
                            </span>
                        </div>
                    );
                }

                // Headings
                const h1Match = line.match(/^#\s+(.*)/);
                if (h1Match) return <h2 key={i} className="text-xl font-bold mt-3 mb-1">{renderInlineFormatting(h1Match[1])}</h2>;
                const h2Match = line.match(/^##\s+(.*)/);
                if (h2Match) return <h3 key={i} className="text-lg font-semibold mt-2 mb-1">{renderInlineFormatting(h2Match[1])}</h3>;
                const h3Match = line.match(/^###\s+(.*)/);
                if (h3Match) return <h4 key={i} className="text-base font-semibold mt-2">{renderInlineFormatting(h3Match[1])}</h4>;

                // Bullet list items
                const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
                if (bulletMatch) {
                    return (
                        <div key={i} className="flex items-start gap-2 py-0.5 pl-1">
                            <span className="text-muted-foreground mt-1.5 shrink-0">•</span>
                            <span className="text-sm">{renderInlineFormatting(bulletMatch[1])}</span>
                        </div>
                    );
                }

                // Numbered list
                const numMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
                if (numMatch) {
                    return (
                        <div key={i} className="flex items-start gap-2 py-0.5 pl-1">
                            <span className="text-muted-foreground text-sm font-medium shrink-0">{numMatch[1]}.</span>
                            <span className="text-sm">{renderInlineFormatting(numMatch[2])}</span>
                        </div>
                    );
                }

                // Horizontal rule
                if (/^---+$/.test(line.trim())) {
                    return <hr key={i} className="border-border/50 my-2" />;
                }

                // Empty line
                if (!line.trim()) return <div key={i} className="h-2" />;

                // Regular paragraph
                return <p key={i} className="text-sm py-0.5">{renderInlineFormatting(line)}</p>;
            })}
        </div>
    );
}

// Near-invisible syntax marker — preserves character width for cursor alignment
// but visually disappears so raw markdown isn't visible
function HiddenSyntax({ children }: { children: React.ReactNode }) {
    return <span className="text-transparent select-none" aria-hidden="true">{children}</span>;
}

// Helper to render formatting in the editor overlay
function renderEditorLine(text: string, onToggle?: (idxInLine: number) => void) {
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;

    const checklistRegex = /([-*]\s*)\[([ xX])\]/g;
    let checkMatch;

    while ((checkMatch = checklistRegex.exec(text)) !== null) {
        parts.push(renderFormatting(text.substring(lastIdx, checkMatch.index)));

        const prefix = checkMatch[1];
        const char = checkMatch[2];
        const checked = char.toLowerCase() === "x";
        const matchIdx = checkMatch.index;

        // Hide prefix (e.g., "- ")
        parts.push(<HiddenSyntax key={`prefix-${matchIdx}`}>{prefix}</HiddenSyntax>);
        // Hide brackets [ ]
        parts.push(<HiddenSyntax key={`bracket-l-${matchIdx}`}>[</HiddenSyntax>);

        // INTERACTIVE CIRCLE — wrapper must match character width exactly
        // Using a simple relative span allows the transparent char to dictate width naturally
        parts.push(
            <span key={`circle-${matchIdx}`} className="relative group">
                <span className="text-transparent select-none" aria-hidden="true">{char}</span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onToggle) onToggle(matchIdx + prefix.length + 1);
                    }}
                    style={{ width: '14px', height: '14px', borderRadius: '50%', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                    className={cn(
                        "border flex items-center justify-center transition-all hover:scale-110 active:scale-95 pointer-events-auto p-0",
                        checked ? "bg-primary border-primary shadow-sm" : "border-muted-foreground/40 bg-background/50"
                    )}
                >
                    {checked && <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[3]" />}
                </button>
            </span>
        );
        parts.push(<HiddenSyntax key={`bracket-r-${matchIdx}`}>]</HiddenSyntax>);

        lastIdx = checklistRegex.lastIndex;
    }

    parts.push(renderFormatting(text.substring(lastIdx)));
    return parts;
}

// Helper for bold/italic/heading-prefix in editor overlay — hides syntax markers
// IMPORTANT: overlay must match textarea character widths exactly for cursor alignment.
// Only use text-transparent (same width) and color-only styles (no font-size changes).
function renderFormatting(text: string) {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Hide leading heading markers (e.g. "## " → transparent, rest gets bold color)
    const headingMatch = remaining.match(/^(#{1,6}\s)/);
    if (headingMatch) {
        parts.push(<HiddenSyntax key={`fmt-${key++}`}>{headingMatch[1]}</HiddenSyntax>);
        const afterPrefix = remaining.substring(headingMatch[1].length);
        // Only apply color — NOT font-weight/size (which would break alignment)
        parts.push(<span key={`fmt-${key++}`} className="text-primary font-medium">{renderFormattingInline(afterPrefix)}</span>);
        return parts;
    }

    // Hide leading bullet markers — just make them transparent, don't add extra chars
    const bulletMatch = remaining.match(/^(\s*[-*]\s+)(?!\[)/);
    if (bulletMatch) {
        parts.push(<HiddenSyntax key={`fmt-${key++}`}>{bulletMatch[1]}</HiddenSyntax>);
        remaining = remaining.substring(bulletMatch[1].length);
    }

    parts.push(...renderFormattingInline(remaining, key));
    return parts;
}

// Inline formatting: **bold**, *italic* — uses zero-width hidden spans
function renderFormattingInline(text: string, keyOffset: number = 0): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = keyOffset;

    while (remaining.length > 0) {
        // Bold: **text**
        const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
        if (boldMatch) {
            if (boldMatch[1]) parts.push(<span key={`ifmt-${key++}`} className="text-foreground">{boldMatch[1]}</span>);
            parts.push(<HiddenSyntax key={`ifmt-${key++}`}>**</HiddenSyntax>);
            // Use color instead of font-weight to preserve width
            parts.push(<span key={`ifmt-${key++}`} className="text-primary font-medium">{boldMatch[2]}</span>);
            parts.push(<HiddenSyntax key={`ifmt-${key++}`}>**</HiddenSyntax>);
            remaining = boldMatch[3];
            continue;
        }

        // Italic: *text*
        const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
        if (italicMatch) {
            if (italicMatch[1]) parts.push(<span key={`ifmt-${key++}`} className="text-foreground">{italicMatch[1]}</span>);
            parts.push(<HiddenSyntax key={`ifmt-${key++}`}>*</HiddenSyntax>);
            // Use color instead of italic style to preserve width
            parts.push(<span key={`ifmt-${key++}`} className="text-primary/70">{italicMatch[2]}</span>);
            parts.push(<HiddenSyntax key={`ifmt-${key++}`}>*</HiddenSyntax>);
            remaining = italicMatch[3];
            continue;
        }

        parts.push(<span key={`ifmt-${key++}`} className="text-foreground">{remaining}</span>);
        break;
    }
    return parts;
}

// ===== HYBRID EDITOR =====
function NoteEditor({ value, onChange, textareaRef, placeholder, className }: {
    value: string;
    onChange: (val: string) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    placeholder?: string;
    className?: string;
}) {
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (textareaRef.current && overlayRef.current) {
            overlayRef.current.scrollTop = textareaRef.current.scrollTop;
            overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    const handleToggleAtPosition = (lineIdx: number, charIdx: number) => {
        const lines = value.split("\n");
        const line = lines[lineIdx];
        if (!line) return;

        const char = line[charIdx];
        const newChar = char.toLowerCase() === "x" ? " " : "x";

        lines[lineIdx] = line.substring(0, charIdx) + newChar + line.substring(charIdx + 1);
        onChange(lines.join("\n"));
    };

    const typographyStyles = "text-sm leading-relaxed whitespace-pre-wrap break-words";
    const paddingStyles = "px-4 py-3 sm:px-5 sm:py-4";

    const wordCount = useMemo(() => {
        const words = value.trim().split(/\s+/).filter(Boolean).length;
        return words;
    }, [value]);

    return (
        <div className={cn("relative rounded-xl border border-white/[0.08] bg-gradient-to-b from-background/80 to-background/60 backdrop-blur-md overflow-hidden ring-offset-background transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_24px_-4px_rgba(0,0,0,0.15)]", className)}>
            {/* Background Overlay Layer */}
            <div
                ref={overlayRef}
                aria-hidden="true"
                className={cn(
                    "absolute inset-0 z-20 pointer-events-none select-none overflow-hidden",
                    typographyStyles,
                    paddingStyles
                )}
            >
                {value.split("\n").map((line, i) => (
                    <div key={i} className="min-h-[1.5em]">
                        {renderEditorLine(line, (charIdx) => handleToggleAtPosition(i, charIdx))}
                    </div>
                ))}
            </div>

            {/* Editing Layer */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                spellCheck={false}
                className={cn(
                    "w-full bg-transparent relative z-10 border-none focus-visible:ring-0 focus:outline-none shadow-none resize-none min-h-[200px] sm:min-h-[300px] text-transparent caret-primary selection:bg-primary/20",
                    typographyStyles,
                    paddingStyles
                )}
            />

            {/* Word count */}
            {value.length > 0 && (
                <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50 z-20 pointer-events-none">
                    {wordCount} {wordCount === 1 ? "word" : "words"}
                </div>
            )}
        </div>
    );
}

// Render inline formatting: **bold**, *italic*, `code`, ~~strikethrough~~
function renderInlineFormatting(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Bold: **text**
        const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
        if (boldMatch) {
            if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
            parts.push(<strong key={key++} className="font-bold">{boldMatch[2]}</strong>);
            remaining = boldMatch[3];
            continue;
        }
        // Italic: *text*
        const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
        if (italicMatch) {
            if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
            parts.push(<em key={key++} className="italic">{italicMatch[2]}</em>);
            remaining = italicMatch[3];
            continue;
        }
        // Code: `text`
        const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
        if (codeMatch) {
            if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
            parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">{codeMatch[2]}</code>);
            remaining = codeMatch[3];
            continue;
        }
        // Strikethrough: ~~text~~
        const strikeMatch = remaining.match(/^(.*?)~~(.+?)~~(.*)/s);
        if (strikeMatch) {
            if (strikeMatch[1]) parts.push(<span key={key++}>{strikeMatch[1]}</span>);
            parts.push(<del key={key++} className="line-through text-muted-foreground">{strikeMatch[2]}</del>);
            remaining = strikeMatch[3];
            continue;
        }
        // No more formatting, push rest as plain text
        parts.push(<span key={key++}>{remaining}</span>);
        break;
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ===== TOOLBAR WITH AI ENHANCE =====
function NoteToolbar({ textareaRef, onContentChange, noteTitle, allNotes }: {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    onContentChange: (content: string) => void;
    noteTitle?: string;
    allNotes?: Note[];
}) {
    const [copied, setCopied] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const aiInputRef = useRef<HTMLInputElement>(null);
    const cursorRef = useRef({ start: 0, end: 0 });

    const saveCursor = () => {
        const ta = textareaRef.current;
        if (ta) cursorRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
    };

    const insert = (prefix: string, suffix: string = "") => {
        const ta = textareaRef.current;
        if (!ta) return;
        const { start, end } = cursorRef.current;
        const val = ta.value;
        const selected = val.substring(start, end);
        const before = val.substring(0, start);
        const after = val.substring(end);
        const newContent = before + prefix + selected + suffix + after;
        const newPos = start + prefix.length + selected.length;
        onContentChange(newContent);
        cursorRef.current = { start: newPos, end: newPos };
        setTimeout(() => { ta.focus(); ta.selectionStart = newPos; ta.selectionEnd = newPos; }, 20);
    };

    const addNewLine = (prefix: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const { start } = cursorRef.current;
        const val = ta.value;
        const before = val.substring(0, start);
        const after = val.substring(start);
        const needsNewline = before.length > 0 && !before.endsWith("\n");
        const toInsert = (needsNewline ? "\n" : "") + prefix;
        const newContent = before + toInsert + after;
        const newPos = start + toInsert.length;
        onContentChange(newContent);
        cursorRef.current = { start: newPos, end: newPos };
        setTimeout(() => { ta.focus(); ta.selectionStart = newPos; ta.selectionEnd = newPos; }, 20);
    };

    const handleCopy = () => {
        const ta = textareaRef.current;
        if (ta) navigator.clipboard.writeText(ta.value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleAiEnhance = async () => {
        if (!aiPrompt.trim() || aiLoading) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const currentContent = textareaRef.current?.value || "";
            const result = await enhanceNoteWithAI(
                aiPrompt.trim(),
                { title: noteTitle || "", content: currentContent },
                (allNotes || []).map(n => ({ title: n.title, content: n.content, tags: n.tags }))
            );
            onContentChange(result);
            setAiPrompt("");
            setAiOpen(false);
        } catch (err: any) {
            setAiError(err?.message || "AI enhancement failed");
        } finally {
            setAiLoading(false);
        }
    };

    const tools = [
        { icon: Bold, label: "Bold", action: () => insert("**", "**") },
        { icon: Italic, label: "Italic", action: () => insert("*", "*") },
        { icon: Heading, label: "Heading", action: () => addNewLine("## ") },
        { icon: List, label: "Bullet List", action: () => addNewLine("- ") },
        { icon: ListChecks, label: "Checklist", action: () => addNewLine("- [ ] ") },
        { icon: copied ? Check : Copy, label: "Copy", action: handleCopy },
    ];

    const aiSuggestions = [
        "Organize this note with headings and checklists",
        "Make this more detailed and actionable",
        "Summarize all my notes on this topic",
        "Create a study plan from my notes",
    ];

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-2 sm:px-3 border border-white/[0.06] bg-gradient-to-r from-secondary/40 to-secondary/20 rounded-xl backdrop-blur-sm shadow-sm">
                {tools.map((tool, i) => (
                    <Button key={i} type="button" variant="ghost" size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); saveCursor(); }}
                        onClick={() => tool.action()}
                        title={tool.label}
                    >
                        <tool.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                ))}

                {/* Divider */}
                <div className="w-px h-5 bg-border/50 mx-0.5" />

                {/* AI Enhance Button */}
                <Button
                    type="button"
                    variant={aiOpen ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                        "h-7 sm:h-8 rounded-lg gap-1.5 text-xs font-medium transition-all",
                        aiOpen
                            ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                            : "text-muted-foreground hover:text-foreground hover:bg-violet-500/10"
                    )}
                    onClick={() => {
                        setAiOpen(!aiOpen);
                        setAiError(null);
                        if (!aiOpen) setTimeout(() => aiInputRef.current?.focus(), 100);
                    }}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">AI</span>
                </Button>
            </div>

            {/* AI Prompt Panel */}
            <AnimatePresence>
                {aiOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 sm:p-4 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 backdrop-blur-sm space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
                                <p className="text-xs text-violet-300/80 font-medium">Ask AI to enhance your note</p>
                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto text-muted-foreground hover:text-foreground" onClick={() => setAiOpen(false)}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    ref={aiInputRef}
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiEnhance(); } }}
                                    placeholder={"e.g., 'Analyze my finance notes and create a summary'"}
                                    className="flex-1 text-sm bg-background/50 border-violet-500/20 focus-visible:ring-violet-500/30"
                                    disabled={aiLoading}
                                />
                                <Button
                                    onClick={handleAiEnhance}
                                    disabled={aiLoading || !aiPrompt.trim()}
                                    size="icon"
                                    className="h-9 w-9 shrink-0 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-lg shadow-lg shadow-violet-500/25"
                                >
                                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>

                            {/* Quick suggestions */}
                            <div className="flex flex-wrap gap-1.5">
                                {aiSuggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setAiPrompt(s); aiInputRef.current?.focus(); }}
                                        className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full border border-violet-500/20 text-violet-300/70 hover:text-violet-200 hover:bg-violet-500/10 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {aiError && (
                                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{aiError}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ===== MAIN PAGE =====
export default function NotesPage() {
    const { notes, isLoading, addNote, updateNote, deleteNote } = useNotes();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [newNote, setNewNote] = useState({ title: "", content: "", tags: "" });
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem("lifeos-pinned-notes");
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const newTextareaRef = useRef<HTMLTextAreaElement>(null);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    const togglePin = (id: string) => {
        setPinnedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            localStorage.setItem("lifeos-pinned-notes", JSON.stringify([...next]));
            return next;
        });
    };

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        notes.forEach(n => n.tags?.split(",").forEach(t => { const trimmed = t.trim(); if (trimmed) tagSet.add(trimmed); }));
        return Array.from(tagSet).sort();
    }, [notes]);

    const filteredNotes = useMemo(() => {
        let result = notes.filter((note) => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = !query || note.title.toLowerCase().includes(query) || note.content?.toLowerCase().includes(query) || note.tags?.toLowerCase().includes(query);
            const matchesTag = !activeTag || note.tags?.split(",").map(t => t.trim()).includes(activeTag);
            return matchesSearch && matchesTag;
        });
        result.sort((a, b) => {
            const aPinned = pinnedIds.has(a.id);
            const bPinned = pinnedIds.has(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return result;
    }, [notes, searchQuery, activeTag, pinnedIds]);

    const handleAddNote = async () => {
        if (!newNote.title.trim()) return;
        await addNote.mutateAsync(newNote);
        setNewNote({ title: "", content: "", tags: "" });
        setIsDialogOpen(false);
    };

    const handleUpdateNote = async () => {
        if (!selectedNote) return;
        await updateNote.mutateAsync(selectedNote);
        setSelectedNote(null);
    };

    const handleCheckboxToggle = async (note: Note, index: number) => {
        const newContent = toggleChecklistItem(note.content || "", index);
        const updated = { ...note, content: newContent };
        if (selectedNote?.id === note.id) setSelectedNote(updated);
        await updateNote.mutateAsync(updated);
    };

    const totalNotes = notes.length;
    const totalTags = allTags.length;

    return (
        <AppLayout>
            <SEO title="Notes" description="Capture your thoughts and ideas with global circular checklists." />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">

                {/* ===== HEADER ===== */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="hidden md:block">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                <StickyNote className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold font-display tracking-tight">Notes</h1>
                        </div>
                        <p className="text-sm text-muted-foreground ml-14">Capture thoughts and checklists seamlessly</p>
                    </div>
                    <div className="top-toolbar w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-full sm:w-48 md:w-64 glass-input" />
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 shadow-lg shadow-primary/20 shrink-0"><Plus className="w-4 h-4" /><span className="hidden sm:inline">New Note</span><span className="sm:hidden">New</span></Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-xl border-white/[0.08] bg-gradient-to-b from-background to-background/95 backdrop-blur-xl shadow-2xl">
                                <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="w-4 h-4 text-primary" />Create New Note</DialogTitle></DialogHeader>
                                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                                    <Input placeholder="Note title..." value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="text-base sm:text-lg font-semibold" />
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <NoteEditor
                                            textareaRef={newTextareaRef}
                                            value={newNote.content}
                                            onChange={(val) => setNewNote({ ...newNote, content: val })}
                                            placeholder={"Write your note here...\n\n- [ ] Checklist item"}
                                        />
                                        <NoteToolbar textareaRef={newTextareaRef} onContentChange={(c) => setNewNote({ ...newNote, content: c })} noteTitle={newNote.title} allNotes={notes} />
                                    </div>
                                    <Input placeholder="Tags (comma separated)" value={newNote.tags} onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })} />
                                    <Button onClick={handleAddNote} className="w-full rounded-xl h-10 sm:h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30" disabled={addNote.isPending}>
                                        {addNote.isPending ? "Creating..." : "Create Note"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* ===== STATS ===== */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {[
                        { label: "Total Notes", value: totalNotes, icon: BookOpen, color: "text-blue-400", bg: "from-blue-500/15 to-blue-500/5" },
                        { label: "Tags", value: totalTags, icon: Tag, color: "text-violet-400", bg: "from-violet-500/15 to-violet-500/5" },
                        { label: "Recent", value: notes.filter(n => new Date(n.created_at) > new Date(Date.now() - 7 * 86400000)).length, icon: Clock, color: "text-emerald-400", bg: "from-emerald-500/15 to-emerald-500/5" },
                    ].map((stat, i) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className={`glass-card p-2.5 sm:p-4 bg-gradient-to-br ${stat.bg} border border-white/5 rounded-xl`}
                        >
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`p-1.5 sm:p-2 rounded-lg bg-background/50 ${stat.color}`}><stat.icon className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                <div>
                                    <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase leading-tight">{stat.label}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ===== TAG FILTER ===== */}
                {allTags.length > 0 && (
                    <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                        <Button variant={!activeTag ? "default" : "outline"} size="sm" className="text-xs h-7 sm:h-8 rounded-full shrink-0" onClick={() => setActiveTag(null)}>All</Button>
                        {allTags.map(tag => (
                            <Button key={tag} variant={activeTag === tag ? "default" : "outline"} size="sm" className="text-xs h-7 sm:h-8 rounded-full shrink-0" onClick={() => setActiveTag(activeTag === tag ? null : tag)}>
                                #{tag}
                            </Button>
                        ))}
                    </div>
                )}

                {/* ===== NOTES GRID ===== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {isLoading ? (
                        <div className="col-span-full py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="col-span-full text-center py-16 sm:py-20 opacity-50"><StickyNote className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-20" /><p className="text-sm sm:text-base">No notes found</p></div>
                    ) : (
                        filteredNotes.map((note, index) => {
                            const stats = getChecklistStats(note.content || "");
                            return (
                                <motion.div key={note.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.03 }}
                                    className={cn("glass-card p-4 sm:p-5 cursor-pointer transition-all duration-300 group flex flex-col h-auto sm:h-[280px] rounded-xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5", pinnedIds.has(note.id) ? "border-primary/30 bg-primary/5 shadow-md shadow-primary/10" : "hover:border-primary/20")}
                                    onClick={() => setSelectedNote(note)}
                                >
                                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                                            <h3 className="font-semibold truncate text-base sm:text-lg">{note.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}>
                                                <Pin className={cn("w-3 h-3", pinnedIds.has(note.id) && "fill-primary text-primary")} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); }}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-hidden relative mb-2 sm:mb-3 max-h-[160px] sm:max-h-none">
                                        <RichNoteView content={note.content || ""} onToggleCheckbox={(idx) => handleCheckboxToggle(note, idx)} />
                                        <div className="absolute bottom-0 inset-x-0 h-10 sm:h-12 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                                    </div>
                                    {/* Progress bar for checklists */}
                                    {stats && (
                                        <div className="mb-2">
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                                <span>{stats.checked}/{stats.total} done</span>
                                                <span>{Math.round((stats.checked / stats.total) * 100)}%</span>
                                            </div>
                                            <div className="h-1 bg-secondary/50 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500" style={{ width: `${(stats.checked / stats.total) * 100}%` }} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-auto flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-2 sm:pt-3">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <Edit3 className="w-3 h-3 text-primary/50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                                            <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {note.tags?.split(",").slice(0, 2).map((t, i) => t.trim() && <Badge key={i} variant="outline" className="text-[9px] h-4">#{t.trim()}</Badge>)}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* ===== VIEW/EDIT DIALOG ===== */}
                <Dialog open={!!selectedNote} onOpenChange={(open) => { if (!open) setSelectedNote(null); }}>
                    <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-xl border-white/[0.08] bg-gradient-to-b from-background to-background/95 backdrop-blur-xl shadow-2xl">
                        {selectedNote && (
                            <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                                <DialogHeader><DialogTitle className="text-base sm:text-lg flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary" />Edit Note</DialogTitle></DialogHeader>
                                <Input value={selectedNote.title} onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })} className="text-lg sm:text-xl font-bold bg-transparent border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40" placeholder="Note title..." />
                                <div className="space-y-1.5 sm:space-y-2">
                                    <NoteEditor
                                        textareaRef={editTextareaRef}
                                        value={selectedNote.content || ""}
                                        onChange={(val) => setSelectedNote({ ...selectedNote, content: val })}
                                    />
                                    <NoteToolbar textareaRef={editTextareaRef} onContentChange={(c) => setSelectedNote({ ...selectedNote, content: c })} noteTitle={selectedNote.title} allNotes={notes} />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                                        <Input placeholder="Tags (comma separated)..." value={selectedNote.tags || ""} onChange={(e) => setSelectedNote({ ...selectedNote, tags: e.target.value })} className="flex-1 pl-9" />
                                    </div>
                                    <Button onClick={handleUpdateNote} disabled={updateNote.isPending} className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30">{updateNote.isPending ? "Saving..." : "Save Changes"}</Button>
                                </div>
                                <div className="pt-3 sm:pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-muted-foreground">
                                    <span>Created {new Date(selectedNote.created_at).toLocaleString()}</span>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { deleteNote.mutate(selectedNote.id); setSelectedNote(null); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        </AppLayout>
    );
}

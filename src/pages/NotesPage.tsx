import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
    Plus, FileText, Trash2, Tag, Search, StickyNote, BookOpen, Clock,
    Pin, PinOff, CheckSquare, Eye, EyeOff, Bold, Italic, Heading,
    List, ListChecks, Copy, Check, Edit3
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
                        <label key={i} className="flex items-start gap-2.5 py-1 cursor-pointer group select-none">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggleCheckbox?.(idx)}
                                className="mt-1 w-4 h-4 rounded border-2 border-muted-foreground/40 text-primary accent-primary cursor-pointer"
                            />
                            <span className={cn("text-sm flex-1", checked && "line-through text-muted-foreground")}>
                                {renderInlineFormatting(checkMatch[2])}
                            </span>
                        </label>
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

// ===== TOOLBAR (only shown in raw edit mode) =====
function NoteToolbar({ textareaRef, onContentChange }: {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    onContentChange: (content: string) => void;
}) {
    const [copied, setCopied] = useState(false);
    // We track cursor position in a ref so it persists even after focus loss
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

    const tools = [
        { icon: Bold, label: "Bold", action: () => insert("**", "**") },
        { icon: Italic, label: "Italic", action: () => insert("*", "*") },
        { icon: Heading, label: "Heading", action: () => addNewLine("## ") },
        { icon: List, label: "Bullet List", action: () => addNewLine("- ") },
        { icon: ListChecks, label: "Checklist", action: () => addNewLine("- [ ] ") },
        { icon: copied ? Check : Copy, label: "Copy", action: handleCopy },
    ];

    return (
        <div className="flex items-center gap-1 py-2 px-1 border-t border-border/50 bg-secondary/20 rounded-b-lg">
            {tools.map((tool, i) => (
                <Button key={i} type="button" variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onMouseDown={(e) => { e.preventDefault(); saveCursor(); }}
                    onClick={() => tool.action()}
                    title={tool.label}
                >
                    <tool.icon className="w-4 h-4" />
                </Button>
            ))}
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
    const [editMode, setEditMode] = useState(false); // false = rich view, true = raw edit
    const [createRawMode, setCreateRawMode] = useState(false);
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
        setCreateRawMode(false);
        setIsDialogOpen(false);
    };

    const handleUpdateNote = async () => {
        if (!selectedNote) return;
        await updateNote.mutateAsync(selectedNote);
        setSelectedNote(null);
        setEditMode(false);
    };

    const handleCheckboxToggle = async (note: Note, index: number) => {
        const newContent = toggleChecklistItem(note.content || "", index);
        const updated = { ...note, content: newContent };
        // If editing, update local state
        if (selectedNote?.id === note.id) {
            setSelectedNote(updated);
        }
        await updateNote.mutateAsync(updated);
    };

    const totalNotes = notes.length;
    const totalTags = allTags.length;

    return (
        <AppLayout>
            <SEO title="Notes" description="Capture your thoughts and ideas with checklists and formatting." />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                {/* ===== HEADER ===== */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                <StickyNote className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold">Notes</h1>
                        </div>
                        <p className="text-muted-foreground ml-14">Capture thoughts, checklists, and ideas</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-48 md:w-64" />
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setCreateRawMode(false); }}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> New Note</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Create New Note</DialogTitle></DialogHeader>
                                <div className="space-y-3 pt-4">
                                    <Input placeholder="Note title..." value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="text-lg font-semibold" />

                                    <Textarea
                                        ref={newTextareaRef}
                                        placeholder={"Write your note here...\n\nTips:\n- [ ] Create checklists\n**Bold text**\n*Italic text*\n## Headings\n- Bullet lists"}
                                        value={newNote.content}
                                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                                        className="min-h-[250px] font-mono text-sm"
                                        onSelect={() => {
                                            const ta = newTextareaRef.current;
                                            if (ta) (newTextareaRef as any)._cursor = { start: ta.selectionStart, end: ta.selectionEnd };
                                        }}
                                    />

                                    {/* Toolbar */}
                                    <NoteToolbar
                                        textareaRef={newTextareaRef}
                                        onContentChange={(c) => setNewNote({ ...newNote, content: c })}
                                    />

                                    <Input placeholder="Tags (comma separated)" value={newNote.tags} onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })} />
                                    <Button onClick={handleAddNote} className="w-full" disabled={addNote.isPending}>
                                        {addNote.isPending ? "Creating..." : "Create Note"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* ===== STATS ===== */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Total Notes", value: totalNotes, icon: BookOpen, color: "text-blue-400", bg: "from-blue-500/15 to-blue-500/5" },
                        { label: "Tags Used", value: totalTags, icon: Tag, color: "text-violet-400", bg: "from-violet-500/15 to-violet-500/5" },
                        { label: "This Week", value: notes.filter(n => new Date(n.created_at) > new Date(Date.now() - 7 * 86400000)).length, icon: Clock, color: "text-emerald-400", bg: "from-emerald-500/15 to-emerald-500/5" },
                    ].map((stat, i) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className={`glass-card p-4 bg-gradient-to-br ${stat.bg} border border-white/5`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-background/50 ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ===== TAG FILTER ===== */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <Button variant={!activeTag ? "default" : "outline"} size="sm" className="text-xs h-7 rounded-full" onClick={() => setActiveTag(null)}>All</Button>
                        {allTags.map(tag => (
                            <Button key={tag} variant={activeTag === tag ? "default" : "outline"} size="sm" className="text-xs h-7 rounded-full" onClick={() => setActiveTag(activeTag === tag ? null : tag)}>
                                #{tag}
                            </Button>
                        ))}
                    </div>
                )}

                {/* ===== NOTES GRID ===== */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center py-12">
                            <div className="animate-pulse flex flex-col items-center gap-3">
                                <StickyNote className="w-10 h-10 opacity-50" />
                                <span className="text-muted-foreground">Loading notes...</span>
                            </div>
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                    <StickyNote className="w-12 h-12 text-primary opacity-60" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">{searchQuery || activeTag ? "No matching notes" : "Start Capturing Ideas"}</h3>
                                    <p className="text-muted-foreground text-sm">{searchQuery || activeTag ? "Try a different search or tag filter" : "Create your first note to get started!"}</p>
                                </div>
                                {!searchQuery && !activeTag && (
                                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2"><Plus className="w-4 h-4" /> Create First Note</Button>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        filteredNotes.map((note, index) => {
                            const isPinned = pinnedIds.has(note.id);
                            const checklistStats = note.content ? getChecklistStats(note.content) : null;

                            return (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={cn(
                                        "glass-card p-5 cursor-pointer transition-all group flex flex-col h-[280px]",
                                        isPinned ? "border-primary/30 bg-primary/5" : "hover:border-primary/30"
                                    )}
                                    onClick={() => { setSelectedNote(note); setEditMode(false); }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                            <FileText className="w-4 h-4 text-primary shrink-0" />
                                            <h3 className="font-semibold truncate text-lg">{note.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
                                            >
                                                {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Card content: always rich view with clickable checkboxes */}
                                    <div className="flex-1 overflow-hidden relative mb-3" onClick={(e) => e.stopPropagation()}>
                                        <RichNoteView
                                            content={note.content || "No content"}
                                            onToggleCheckbox={(idx) => handleCheckboxToggle(note, idx)}
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {checklistStats && (
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] h-5 gap-1",
                                                    checklistStats.checked === checklistStats.total
                                                        ? "border-green-500/30 text-green-400"
                                                        : "border-blue-500/30 text-blue-400"
                                                )}>
                                                    <CheckSquare className="w-3 h-3" />
                                                    {checklistStats.checked}/{checklistStats.total}
                                                </Badge>
                                            )}
                                            {note.tags && note.tags.split(",").slice(0, 3).map((tag, i) => (
                                                <Badge key={i} variant="outline" className={`text-[10px] h-5 border ${getTagColor(tag.trim())}`}>
                                                    #{tag.trim()}
                                                </Badge>
                                            ))}
                                            {note.tags && note.tags.split(",").length > 3 && (
                                                <Badge variant="secondary" className="text-[10px] h-5">+{note.tags.split(",").length - 3}</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-muted-foreground">
                                                {new Date(note.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </p>
                                            {isPinned && <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary">Pinned</Badge>}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* ===== VIEW/EDIT NOTE DIALOG ===== */}
                <Dialog open={!!selectedNote} onOpenChange={(open) => { if (!open) { setSelectedNote(null); setEditMode(false); } }}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        {selectedNote && (
                            <div className="space-y-3">
                                {/* Header with mode toggle */}
                                <div className="flex items-center justify-between">
                                    <DialogHeader className="flex-1"><DialogTitle>{editMode ? "Edit Note" : selectedNote.title}</DialogTitle></DialogHeader>
                                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs"
                                        onClick={() => setEditMode(!editMode)}
                                    >
                                        {editMode ? <><Eye className="w-3.5 h-3.5" /> View</> : <><Edit3 className="w-3.5 h-3.5" /> Edit</>}
                                    </Button>
                                </div>

                                {editMode ? (
                                    /* ===== RAW EDIT MODE ===== */
                                    <div className="space-y-3">
                                        <Input placeholder="Note title..." value={selectedNote.title}
                                            onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
                                            className="text-lg font-semibold"
                                        />
                                        <Textarea
                                            ref={editTextareaRef}
                                            placeholder="Write your note..."
                                            value={selectedNote.content || ""}
                                            onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                                            className="min-h-[300px] font-mono text-sm"
                                        />
                                        <NoteToolbar
                                            textareaRef={editTextareaRef}
                                            onContentChange={(c) => setSelectedNote({ ...selectedNote, content: c })}
                                        />
                                        <Input placeholder="Tags (comma separated)" value={selectedNote.tags || ""}
                                            onChange={(e) => setSelectedNote({ ...selectedNote, tags: e.target.value })}
                                        />
                                        <Button onClick={handleUpdateNote} className="w-full" disabled={updateNote.isPending}>
                                            {updateNote.isPending ? "Saving..." : "Save Changes"}
                                        </Button>
                                    </div>
                                ) : (
                                    /* ===== RICH VIEW MODE (default) ===== */
                                    <div className="space-y-4">
                                        {/* Tags */}
                                        {selectedNote.tags && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedNote.tags.split(",").map((tag, i) => (
                                                    <Badge key={i} variant="outline" className={`text-xs border ${getTagColor(tag.trim())}`}>
                                                        #{tag.trim()}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Rich content with interactive checkboxes */}
                                        <div className="min-h-[200px] p-2">
                                            <RichNoteView
                                                content={selectedNote.content || "No content yet. Click Edit to start writing."}
                                                onToggleCheckbox={(idx) => handleCheckboxToggle(selectedNote, idx)}
                                            />
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                            <p className="text-xs text-muted-foreground">
                                                Created {new Date(selectedNote.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
                                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => { deleteNote.mutate(selectedNote.id); setSelectedNote(null); }}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        </AppLayout>
    );
}

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Plus, FileText, Trash2, Tag, Search, StickyNote, BookOpen, Clock,
    Pin, PinOff, CheckSquare, Square, Eye, EyeOff, Bold, Italic, Heading,
    List, ListChecks, Copy, Check
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
function parseChecklist(content: string): { text: string; checked: boolean }[] | null {
    const lines = content.split("\n").filter(l => l.trim());
    const checklistLines = lines.filter(l => /^\s*[-*]\s*\[[ xX]\]/.test(l));
    if (checklistLines.length === 0) return null;
    return lines.map(l => {
        const match = l.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)/);
        if (match) return { text: match[2], checked: match[1] !== " " };
        return { text: l, checked: false };
    });
}

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

function addChecklistItem(content: string): string {
    const trimmed = content.trimEnd();
    return trimmed + (trimmed ? "\n" : "") + "- [ ] ";
}

function getChecklistStats(content: string): { total: number; checked: number } | null {
    const items = parseChecklist(content);
    if (!items) return null;
    const checkItems = items.filter(i => content.includes(`[${i.checked ? "x" : " "}] ${i.text}`));
    const total = (content.match(/\[[ xX]\]/g) || []).length;
    const checked = (content.match(/\[[xX]\]/g) || []).length;
    if (total === 0) return null;
    return { total, checked };
}

// ===== TOOLBAR COMPONENT =====
function NoteToolbar({ content, onContentChange, textareaRef }: {
    content: string;
    onContentChange: (content: string) => void;
    textareaRef?: React.RefObject<HTMLTextAreaElement>;
}) {
    const [copied, setCopied] = useState(false);

    const insertAtCursor = useCallback((prefix: string, suffix: string = "") => {
        const ta = textareaRef?.current;
        if (!ta) { onContentChange(content + prefix); return; }
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = content.substring(start, end);
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + prefix + selected + suffix + after;
        onContentChange(newContent);
        setTimeout(() => {
            ta.focus();
            ta.selectionStart = start + prefix.length;
            ta.selectionEnd = start + prefix.length + selected.length;
        }, 10);
    }, [content, onContentChange, textareaRef]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const tools = [
        { icon: Bold, label: "Bold", action: () => insertAtCursor("**", "**") },
        { icon: Italic, label: "Italic", action: () => insertAtCursor("*", "*") },
        { icon: Heading, label: "Heading", action: () => insertAtCursor("## ") },
        { icon: List, label: "Bullet List", action: () => insertAtCursor("- ") },
        { icon: ListChecks, label: "Checklist", action: () => onContentChange(addChecklistItem(content)) },
        { icon: copied ? Check : Copy, label: "Copy", action: handleCopy },
    ];

    return (
        <div className="flex items-center gap-1 py-2 px-1 border-t border-border/50 bg-secondary/20 rounded-b-lg">
            {tools.map((tool, i) => (
                <Button key={i} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={tool.action} title={tool.label}>
                    <tool.icon className="w-4 h-4" />
                </Button>
            ))}
        </div>
    );
}

// ===== INTERACTIVE CHECKLIST VIEWER =====
function ChecklistView({ content, onToggle }: { content: string; onToggle?: (index: number) => void }) {
    const lines = content.split("\n");
    let checkIdx = 0;
    return (
        <div className="space-y-1.5">
            {lines.map((line, i) => {
                const match = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)/);
                if (match) {
                    const idx = checkIdx++;
                    const checked = match[1] !== " ";
                    return (
                        <div key={i} className="flex items-start gap-2 group cursor-pointer" onClick={() => onToggle?.(idx)}>
                            <div className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                checked ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary/60"
                            )}>
                                {checked && <Check className="w-3 h-3 text-primary-foreground stroke-[3px]" />}
                            </div>
                            <span className={cn("text-sm flex-1", checked && "line-through text-muted-foreground")}>{match[2]}</span>
                        </div>
                    );
                }
                if (line.trim()) {
                    return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
                }
                return null;
            })}
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
    const [showPreview, setShowPreview] = useState(false);
    const [showEditPreview, setShowEditPreview] = useState(false);
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem("lifeos-pinned-notes");
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const newTextareaRef = { current: null as HTMLTextAreaElement | null };
    const editTextareaRef = { current: null as HTMLTextAreaElement | null };

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
        setShowPreview(false);
        setIsDialogOpen(false);
    };

    const handleUpdateNote = async () => {
        if (!selectedNote) return;
        await updateNote.mutateAsync(selectedNote);
        setSelectedNote(null);
        setShowEditPreview(false);
    };

    const handleCardChecklistToggle = async (note: Note, index: number) => {
        const newContent = toggleChecklistItem(note.content || "", index);
        const updated = { ...note, content: newContent };
        await updateNote.mutateAsync(updated);
    };

    const totalNotes = notes.length;
    const totalTags = allTags.length;

    return (
        <AppLayout>
            <SEO title="Notes" description="Capture your thoughts and ideas with Markdown and checklist support." />
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
                        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setShowPreview(false); }}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> New Note</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Create New Note</DialogTitle></DialogHeader>
                                <div className="space-y-3 pt-4">
                                    <Input placeholder="Note title..." value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="text-lg font-semibold" />

                                    {showPreview ? (
                                        <div className="border border-border rounded-lg p-4 min-h-[250px] prose prose-invert prose-sm overflow-y-auto bg-secondary/30">
                                            {newNote.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{newNote.content}</ReactMarkdown> : <p className="text-muted-foreground italic">Nothing to preview yet...</p>}
                                        </div>
                                    ) : (
                                        <Textarea
                                            ref={(el) => { newTextareaRef.current = el; }}
                                            placeholder="Write your note... (Markdown supported, use - [ ] for checklists)"
                                            value={newNote.content}
                                            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                                            className="min-h-[250px] font-mono text-sm"
                                        />
                                    )}

                                    {/* Toolbar */}
                                    <div className="flex items-center justify-between">
                                        <NoteToolbar
                                            content={newNote.content}
                                            onContentChange={(c) => setNewNote({ ...newNote, content: c })}
                                            textareaRef={newTextareaRef as React.RefObject<HTMLTextAreaElement>}
                                        />
                                        <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}
                                            className="text-xs gap-1 text-muted-foreground"
                                        >
                                            {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            {showPreview ? "Edit" : "Preview"}
                                        </Button>
                                    </div>

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
                            const hasChecklist = checklistStats !== null;

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
                                    onClick={() => setSelectedNote(note)}
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

                                    {/* Content: Show checklist view OR text preview */}
                                    <div className="flex-1 overflow-hidden relative mb-3" onClick={(e) => { if (hasChecklist) e.stopPropagation(); }}>
                                        {hasChecklist ? (
                                            <div className="space-y-1">
                                                <ChecklistView
                                                    content={note.content || ""}
                                                    onToggle={(idx) => handleCardChecklistToggle(note, idx)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="prose prose-invert prose-sm line-clamp-[8] text-muted-foreground text-sm">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content || "No content"}</ReactMarkdown>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {/* Checklist progress badge */}
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
                                            {/* Tags */}
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

                {/* ===== EDIT NOTE DIALOG ===== */}
                <Dialog open={!!selectedNote} onOpenChange={(open) => { if (!open) { setSelectedNote(null); setShowEditPreview(false); } }}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Edit Note</DialogTitle></DialogHeader>
                        {selectedNote && (
                            <div className="space-y-3 pt-4">
                                <Input placeholder="Note title..." value={selectedNote.title} onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })} className="text-lg font-semibold" />

                                {showEditPreview ? (
                                    <div className="border border-border rounded-lg p-4 min-h-[250px] prose prose-invert prose-sm overflow-y-auto bg-secondary/30">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedNote.content || ""}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <Textarea
                                        ref={(el) => { editTextareaRef.current = el; }}
                                        placeholder="Write your note... (Markdown supported, use - [ ] for checklists)"
                                        value={selectedNote.content || ""}
                                        onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                                        className="min-h-[250px] font-mono text-sm"
                                    />
                                )}

                                {/* Toolbar */}
                                <div className="flex items-center justify-between">
                                    <NoteToolbar
                                        content={selectedNote.content || ""}
                                        onContentChange={(c) => setSelectedNote({ ...selectedNote, content: c })}
                                        textareaRef={editTextareaRef as React.RefObject<HTMLTextAreaElement>}
                                    />
                                    <Button variant="ghost" size="sm" onClick={() => setShowEditPreview(!showEditPreview)}
                                        className="text-xs gap-1 text-muted-foreground"
                                    >
                                        {showEditPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        {showEditPreview ? "Edit" : "Preview"}
                                    </Button>
                                </div>

                                <Input placeholder="Tags (comma separated)" value={selectedNote.tags || ""} onChange={(e) => setSelectedNote({ ...selectedNote, tags: e.target.value })} />
                                <Button onClick={handleUpdateNote} className="w-full" disabled={updateNote.isPending}>
                                    {updateNote.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        </AppLayout>
    );
}

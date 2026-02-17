import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Book, GraduationCap, Trash2, Lightbulb, Search,
    BookOpen, TrendingUp, Award, Brain, Send
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { SEO } from "@/components/seo/SEO";
import { StudyAnalytics } from "@/components/study/StudyAnalytics";
import { useStudy, StudyChapter } from "@/hooks/useStudy";
import { useTaskIntegration } from "@/hooks/useTaskIntegration";
import { getStudyTips } from "@/lib/groq";
import { useToast } from "@/hooks/use-toast";
import { useAI } from "@/contexts/AIContext";

// Color palette for subjects
const SUBJECT_COLORS = [
    { bg: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/30", text: "text-violet-400", accent: "#8b5cf6" },
    { bg: "from-cyan-500/20 to-teal-500/10", border: "border-cyan-500/30", text: "text-cyan-400", accent: "#06b6d4" },
    { bg: "from-emerald-500/20 to-green-500/10", border: "border-emerald-500/30", text: "text-emerald-400", accent: "#10b981" },
    { bg: "from-rose-500/20 to-pink-500/10", border: "border-rose-500/30", text: "text-rose-400", accent: "#f43f5e" },
    { bg: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/30", text: "text-amber-400", accent: "#f59e0b" },
    { bg: "from-indigo-500/20 to-blue-500/10", border: "border-indigo-500/30", text: "text-indigo-400", accent: "#6366f1" },
    { bg: "from-orange-500/20 to-red-500/10", border: "border-orange-500/30", text: "text-orange-400", accent: "#f97316" },
];

export default function StudyPage() {
    const { chapters, subjects, chaptersBySubject, subjectProgress, isLoading, addChapter, updateProgress, deleteChapter } = useStudy();
    const { createStudyTask } = useTaskIntegration();
    const { toast } = useToast();
    const { setPageContext, showBubble } = useAI();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newChapter, setNewChapter] = useState({ subject: "", chapter_name: "" });
    const [aiTips, setAiTips] = useState<string | null>(null);
    const [aiTipsChapter, setAiTipsChapter] = useState<string>("");
    const [loadingTips, setLoadingTips] = useState(false);
    const [activeSubject, setActiveSubject] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Stats
    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(c => c.status === "completed").length;
    const inProgressChapters = chapters.filter(c => c.status === "in-progress").length;
    const overallProgress = totalChapters > 0 ? Math.round(chapters.reduce((sum, c) => sum + c.progress_percentage, 0) / totalChapters) : 0;

    // Set Page Context for AI
    useEffect(() => {
        setPageContext(`User is on Study Page. 
        Total Chapters: ${totalChapters}, Completed: ${completedChapters}, In Progress: ${inProgressChapters}.
        Overall Progress: ${overallProgress}%.
        Subjects: ${subjects.join(", ") || "None yet"}.`);
    }, [totalChapters, completedChapters, inProgressChapters, overallProgress, subjects, setPageContext]);

    const getSubjectColor = (index: number) => SUBJECT_COLORS[index % SUBJECT_COLORS.length];

    // Filtering
    const filteredSubjects = activeSubject === "all" ? subjects : subjects.filter(s => s === activeSubject);

    const filteredChaptersBySubject = useMemo(() => {
        const result: Record<string, StudyChapter[]> = {};
        filteredSubjects.forEach(subject => {
            const subChapters = chaptersBySubject[subject] || [];
            if (searchTerm) {
                const filtered = subChapters.filter(c =>
                    c.chapter_name.toLowerCase().includes(searchTerm.toLowerCase())
                );
                if (filtered.length > 0) result[subject] = filtered;
            } else {
                result[subject] = subChapters;
            }
        });
        return result;
    }, [filteredSubjects, chaptersBySubject, searchTerm]);

    const handleAddChapter = async () => {
        if (!newChapter.subject.trim() || !newChapter.chapter_name.trim()) return;
        await addChapter.mutateAsync(newChapter);
        setNewChapter({ subject: "", chapter_name: "" });
        setIsDialogOpen(false);
    };

    const handleProgressChange = (chapter: StudyChapter, value: number[]) => {
        updateProgress.mutate({ id: chapter.id, progress_percentage: value[0] });
    };

    const handleGetTips = async (subject: string, chapterName: string) => {
        setLoadingTips(true);
        setAiTipsChapter(`${subject} — ${chapterName}`);
        try {
            const tips = await getStudyTips(subject, chapterName);
            setAiTips(tips);
        } catch {
            setAiTips("Failed to get tips. Please try again.");
        }
        setLoadingTips(false);
    };

    const handleSendToTasks = async (chapter: StudyChapter) => {
        try {
            await createStudyTask({
                chapter,
                dueDate: new Date().toISOString().split("T")[0],
                estimatedDuration: 60,
            });
            toast({ title: "📚 Sent to Tasks!", description: `Created task: Study ${chapter.subject} — ${chapter.chapter_name}` });
            showBubble(`Added "${chapter.chapter_name}" to your tasks! Check the Tasks page.`);
        } catch {
            toast({ title: "Failed to send", description: "Please try again", variant: "destructive" });
        }
    };

    const getStatusColor = (progress: number) => {
        if (progress >= 100) return "text-green-400";
        if (progress > 50) return "text-blue-400";
        if (progress > 0) return "text-amber-400";
        return "text-muted-foreground";
    };

    const getStatusBg = (progress: number) => {
        if (progress >= 100) return "bg-green-500/10 border-green-500/20";
        if (progress > 50) return "bg-blue-500/10 border-blue-500/20";
        if (progress > 0) return "bg-amber-500/10 border-amber-500/20";
        return "bg-secondary/50 border-border";
    };

    return (
        <AppLayout>
            <SEO title="Study Tracker" description="Track your academic progress across subjects and chapters." />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">

                {/* ===== SINGLE-ROW CONTROLS ===== */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <h1 className="text-3xl font-bold">Study</h1>
                        <p className="text-muted-foreground text-sm">Track your learning progress</p>
                    </div>

                    <div className="top-toolbar">
                        {/* Subject Filter */}
                        <Select value={activeSubject} onValueChange={setActiveSubject}>
                            <SelectTrigger className="w-auto min-w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                {subjects.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[120px] max-w-[240px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search chapters..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-xs sm:text-sm"
                            />
                        </div>

                        {/* Add Chapter */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" className="h-8 w-8 sm:w-auto sm:px-3 sm:gap-1.5 shadow-lg shadow-primary/20">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Chapter</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                                <DialogHeader><DialogTitle>Add Study Chapter</DialogTitle></DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <Input placeholder="Subject (e.g., Physics, Math)" value={newChapter.subject} onChange={(e) => setNewChapter({ ...newChapter, subject: e.target.value })} />
                                    <Input placeholder="Chapter name (e.g., Chapter 5: Waves)" value={newChapter.chapter_name} onChange={(e) => setNewChapter({ ...newChapter, chapter_name: e.target.value })} />
                                    <Button onClick={handleAddChapter} className="w-full" disabled={addChapter.isPending}>
                                        {addChapter.isPending ? "Adding..." : "Add Chapter"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* ===== STATS GRID ===== */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                    {[
                        { icon: BookOpen, label: "Chapters", value: totalChapters, color: "text-blue-400", bg: "from-blue-500/15 to-blue-500/5" },
                        { icon: TrendingUp, label: "Active", value: inProgressChapters, color: "text-amber-400", bg: "from-amber-500/15 to-amber-500/5" },
                        { icon: Award, label: "Done", value: completedChapters, color: "text-green-400", bg: "from-green-500/15 to-green-500/5" },
                        { icon: Brain, label: "Progress", value: `${overallProgress}%`, color: "text-primary", bg: "from-primary/15 to-primary/5" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className={`glass-card p-2 sm:p-3 bg-gradient-to-br ${stat.bg} border border-white/5`}
                        >
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`p-1.5 sm:p-2 rounded-lg bg-background/50 ${stat.color}`}>
                                    <stat.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm sm:text-lg font-bold">{stat.value}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ===== ANALYTICS ===== */}
                <StudyAnalytics chapters={chapters} />

                {/* ===== AI TIPS ===== */}
                <AnimatePresence>
                    {aiTips && (
                        <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
                            className="glass-card p-4 border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-transparent"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-yellow-500/10"><Lightbulb className="w-5 h-5 text-yellow-400" /></div>
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-1 text-yellow-300">AI Tips — {aiTipsChapter}</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiTips}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setAiTips(null)} className="text-muted-foreground hover:text-foreground">×</Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ===== SUBJECT CARDS ===== */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <div className="animate-pulse flex flex-col items-center gap-3">
                                <Brain className="w-10 h-10 opacity-50" />
                                <span>Loading your study data...</span>
                            </div>
                        </div>
                    ) : Object.keys(filteredChaptersBySubject).length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                    <GraduationCap className="w-12 h-12 text-primary opacity-60" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">
                                        {searchTerm ? "No chapters match your search" : "Start Your Learning Journey"}
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        {searchTerm ? "Try a different search term" : "Add your first subject and chapter to begin tracking!"}
                                    </p>
                                </div>
                                {!searchTerm && (
                                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2">
                                        <Plus className="w-4 h-4" /> Add Your First Chapter
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        Object.keys(filteredChaptersBySubject).map((subject, subIndex) => {
                            const color = getSubjectColor(subjects.indexOf(subject));
                            const progress = subjectProgress.find(s => s.subject === subject);
                            const subChapters = filteredChaptersBySubject[subject];

                            return (
                                <motion.div
                                    key={subject}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: subIndex * 0.1 }}
                                    className={`glass-card overflow-hidden border ${color.border}`}
                                >
                                    {/* Subject Header */}
                                    <div className={`p-3 sm:p-4 bg-gradient-to-r ${color.bg}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div className="p-1.5 sm:p-2 rounded-xl bg-background/50">
                                                    <Book className={`w-4 h-4 sm:w-5 sm:h-5 ${color.text}`} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm sm:text-lg">{subject}</h3>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground">{subChapters.length} chapter{subChapters.length !== 1 ? "s" : ""}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                {/* Progress Badge */}
                                                <div className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full ${(progress?.progress || 0) >= 100 ? "bg-green-500/20 text-green-400" :
                                                    (progress?.progress || 0) > 50 ? "bg-blue-500/20 text-blue-400" :
                                                        (progress?.progress || 0) > 0 ? "bg-amber-500/20 text-amber-400" :
                                                            "bg-secondary/50 text-muted-foreground"
                                                    }`}>
                                                    {progress?.progress || 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chapters */}
                                    <div className="p-2 sm:p-3 space-y-1.5">
                                        {subChapters.map((chapter, ci) => (
                                            <motion.div
                                                key={chapter.id}
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: ci * 0.03 }}
                                                className={`rounded-xl p-2.5 sm:p-3 border transition-all hover:shadow-md ${getStatusBg(chapter.progress_percentage)}`}
                                            >
                                                {/* Chapter name + actions */}
                                                <div className="flex items-center justify-between mb-1.5 gap-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${chapter.progress_percentage >= 100 ? 'bg-green-400' :
                                                            chapter.progress_percentage > 0 ? 'bg-amber-400' :
                                                                'bg-muted-foreground/30'
                                                            }`} />
                                                        <span className="font-medium text-xs sm:text-sm truncate">{chapter.chapter_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                                        {/* AI Tips */}
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-yellow-400"
                                                            onClick={() => handleGetTips(subject, chapter.chapter_name)}
                                                            disabled={loadingTips}
                                                            title="Get AI Tips"
                                                        >
                                                            <Lightbulb className="w-3.5 h-3.5" />
                                                        </Button>
                                                        {/* Send to Tasks */}
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                            onClick={() => handleSendToTasks(chapter)}
                                                            title="Send to Tasks"
                                                        >
                                                            <Send className="w-3.5 h-3.5" />
                                                        </Button>
                                                        {/* Status badge */}
                                                        <Badge
                                                            variant={chapter.status === "completed" ? "default" : "secondary"}
                                                            className={`text-[10px] px-1.5 py-0 ${chapter.status === "completed" ? "bg-green-500/80" : ""}`}
                                                        >
                                                            {chapter.status === "not-started" ? "New" : chapter.status === "in-progress" ? "Active" : "Done"}
                                                        </Badge>
                                                        {/* Delete */}
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            onClick={() => deleteChapter.mutate(chapter.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                {/* Progress slider */}
                                                <div className="flex items-center gap-3">
                                                    <Slider
                                                        value={[chapter.progress_percentage]}
                                                        max={100}
                                                        step={5}
                                                        onValueChange={(v) => handleProgressChange(chapter, v)}
                                                        className="flex-1"
                                                    />
                                                    <span className={`text-xs font-mono font-bold w-8 text-right ${getStatusColor(chapter.progress_percentage)}`}>
                                                        {chapter.progress_percentage}%
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </AppLayout>
    );
}

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Book, GraduationCap, Trash2, Lightbulb, CalendarPlus, Clock, Play, Pause, RotateCcw,
    Target, TrendingUp, BarChart3, Zap, ChevronRight, BookOpen, Timer, Brain, Award, Flame
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo/SEO";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStudy, StudyChapter } from "@/hooks/useStudy";
import { useTaskIntegration } from "@/hooks/useTaskIntegration";
import { getStudyTips } from "@/lib/groq";
import { useToast } from "@/hooks/use-toast";

// Color palette for subjects
const SUBJECT_COLORS = [
    { bg: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/30", text: "text-violet-400", accent: "#8b5cf6" },
    { bg: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/30", text: "text-blue-400", accent: "#3b82f6" },
    { bg: "from-emerald-500/20 to-green-500/10", border: "border-emerald-500/30", text: "text-emerald-400", accent: "#10b981" },
    { bg: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/30", text: "text-amber-400", accent: "#f59e0b" },
    { bg: "from-rose-500/20 to-pink-500/10", border: "border-rose-500/30", text: "text-rose-400", accent: "#f43f5e" },
    { bg: "from-teal-500/20 to-cyan-500/10", border: "border-teal-500/30", text: "text-teal-400", accent: "#14b8a6" },
    { bg: "from-indigo-500/20 to-blue-500/10", border: "border-indigo-500/30", text: "text-indigo-400", accent: "#6366f1" },
    { bg: "from-orange-500/20 to-red-500/10", border: "border-orange-500/30", text: "text-orange-400", accent: "#f97316" },
];

// Circular Progress Component
function CircularProgress({ progress, size = 80, strokeWidth = 6, color = "#8b5cf6" }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-secondary/50" />
            <motion.circle
                cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeDasharray={circumference}
            />
        </svg>
    );
}

export default function StudyPage() {
    const { chapters, subjects, chaptersBySubject, subjectProgress, isLoading, addChapter, updateProgress, deleteChapter } = useStudy();
    const { createStudyTask } = useTaskIntegration();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState<StudyChapter | null>(null);
    const [newChapter, setNewChapter] = useState({ subject: "", chapter_name: "" });
    const [scheduleData, setScheduleData] = useState({ due_date: new Date().toISOString().split("T")[0], duration: "60", start_time: "" });
    const [aiTips, setAiTips] = useState<string | null>(null);
    const [loadingTips, setLoadingTips] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [activeSubject, setActiveSubject] = useState<string | null>(null);

    // Timer State
    const [timerActive, setTimerActive] = useState(false);
    const [timerTime, setTimerTime] = useState(25 * 60);
    const [timerDuration, setTimerDuration] = useState(25);
    const [timerSubject, setTimerSubject] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [sessionsCompleted, setSessionsCompleted] = useState(() => {
        const saved = localStorage.getItem("lifeos-study-sessions");
        return saved ? parseInt(saved) : 0;
    });

    useEffect(() => {
        localStorage.setItem("lifeos-study-sessions", sessionsCompleted.toString());
    }, [sessionsCompleted]);

    useEffect(() => {
        if (timerActive && timerTime > 0) {
            timerRef.current = setInterval(() => setTimerTime((prev) => prev - 1), 1000);
        } else if (timerTime === 0 && timerActive) {
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            setSessionsCompleted(prev => prev + 1);
            toast({ title: "🎉 Session Complete!", description: "Great focus! Take a short break." });
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [timerActive, timerTime, toast]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => setTimerActive(!timerActive);
    const resetTimer = () => { setTimerActive(false); setTimerTime(timerDuration * 60); };

    // Stats
    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(c => c.status === "completed").length;
    const inProgressChapters = chapters.filter(c => c.status === "in-progress").length;
    const overallProgress = totalChapters > 0 ? Math.round(chapters.reduce((sum, c) => sum + c.progress_percentage, 0) / totalChapters) : 0;

    const getSubjectColor = (index: number) => SUBJECT_COLORS[index % SUBJECT_COLORS.length];

    const filteredSubjects = activeSubject ? subjects.filter(s => s === activeSubject) : subjects;

    const handleAddChapter = async () => {
        if (!newChapter.subject.trim() || !newChapter.chapter_name.trim()) return;
        await addChapter.mutateAsync(newChapter);
        setNewChapter({ subject: "", chapter_name: "" });
        setIsDialogOpen(false);
    };

    const handleProgressChange = (chapter: StudyChapter, value: number[]) => {
        updateProgress.mutate({ id: chapter.id, progress_percentage: value[0] });
    };

    const handleGetTips = async (subject: string) => {
        setLoadingTips(true);
        try {
            const tips = await getStudyTips(subject);
            setAiTips(tips);
        } catch {
            setAiTips("Failed to get tips. Please try again.");
        }
        setLoadingTips(false);
    };

    const handleScheduleSession = async () => {
        if (!selectedChapter) return;
        setScheduling(true);
        try {
            await createStudyTask({
                chapter: selectedChapter,
                dueDate: scheduleData.due_date,
                startTime: scheduleData.start_time || undefined,
                estimatedDuration: parseInt(scheduleData.duration),
            });
            toast({ title: "📚 Study session scheduled!", description: `Task created for ${selectedChapter.chapter_name}` });
            setScheduleDialogOpen(false);
            setSelectedChapter(null);
        } catch {
            toast({ title: "Failed to schedule", description: "Please try again", variant: "destructive" });
        }
        setScheduling(false);
    };

    const openScheduleDialog = (chapter: StudyChapter) => {
        setSelectedChapter(chapter);
        setScheduleData({ due_date: new Date().toISOString().split("T")[0], duration: "60", start_time: "" });
        setScheduleDialogOpen(true);
    };

    const startTimerForSubject = (subject: string) => {
        setTimerSubject(subject);
        setTimerDuration(25);
        setTimerTime(25 * 60);
        setTimerActive(false);
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
            <SEO title="Study Command Center" description="Track your academic progress, schedule study sessions, and use the focus timer." />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                {/* ===== HEADER ===== */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                <Brain className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                                Study Command Center
                            </h1>
                        </div>
                        <p className="text-muted-foreground ml-14">Master your subjects with focus and precision</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 shadow-lg shadow-primary/20">
                                <Plus className="w-4 h-4" /> Add Chapter
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
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

                {/* ===== STATS GRID ===== */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: BookOpen, label: "Total Chapters", value: totalChapters, color: "text-blue-400", bg: "from-blue-500/15 to-blue-500/5" },
                        { icon: TrendingUp, label: "In Progress", value: inProgressChapters, color: "text-amber-400", bg: "from-amber-500/15 to-amber-500/5" },
                        { icon: Award, label: "Completed", value: completedChapters, color: "text-green-400", bg: "from-green-500/15 to-green-500/5" },
                        { icon: Flame, label: "Focus Sessions", value: sessionsCompleted, color: "text-rose-400", bg: "from-rose-500/15 to-rose-500/5" },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`glass-card p-4 bg-gradient-to-br ${stat.bg} border border-white/5`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-background/50 ${stat.color}`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ===== FOCUS TIMER + OVERALL PROGRESS ===== */}
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Focus Timer Card */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 border border-primary/10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Timer className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold">Focus Timer</h3>
                            </div>
                            {timerSubject && <Badge variant="secondary" className="text-xs">{timerSubject}</Badge>}
                        </div>
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative w-40 h-40 flex items-center justify-center">
                                <CircularProgress progress={timerDuration > 0 ? ((timerDuration * 60 - timerTime) / (timerDuration * 60)) * 100 : 0} size={160} strokeWidth={8} color="hsl(var(--primary))" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl font-mono font-bold tracking-tight">{formatTime(timerTime)}</span>
                                </div>
                                {timerActive && (
                                    <motion.div className="absolute inset-0 rounded-full border-2 border-primary/20" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={resetTimer}>
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button size="icon" className="h-14 w-14 rounded-full shadow-lg shadow-primary/30" onClick={toggleTimer}>
                                    {timerActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                                </Button>
                            </div>
                            {!timerActive && (
                                <div className="w-full space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                                        <span>Duration</span><span>{timerDuration} min</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {[15, 25, 45, 60].map(d => (
                                            <Button key={d} variant={timerDuration === d ? "default" : "outline"} size="sm" className="flex-1 text-xs h-8"
                                                onClick={() => { setTimerDuration(d); setTimerTime(d * 60); }}
                                            >{d}m</Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Overall Progress Card */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">Overall Progress</h3>
                        </div>
                        <div className="flex items-center justify-center mb-6">
                            <div className="relative">
                                <CircularProgress progress={overallProgress} size={120} strokeWidth={10} color="hsl(var(--primary))" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold">{overallProgress}%</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Complete</span>
                                </div>
                            </div>
                        </div>
                        {/* Subject filter pills */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            <Button variant={!activeSubject ? "default" : "outline"} size="sm" className="text-xs h-7 rounded-full" onClick={() => setActiveSubject(null)}>
                                All
                            </Button>
                            {subjects.map((s, i) => (
                                <Button key={s} variant={activeSubject === s ? "default" : "outline"} size="sm" className="text-xs h-7 rounded-full" onClick={() => setActiveSubject(activeSubject === s ? null : s)}>
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* ===== AI TIPS ===== */}
                <AnimatePresence>
                    {aiTips && (
                        <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
                            className="glass-card p-4 border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-transparent"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-yellow-500/10"><Lightbulb className="w-5 h-5 text-yellow-400" /></div>
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-1 text-yellow-300">AI Study Tips</h3>
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
                    ) : subjects.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                    <GraduationCap className="w-12 h-12 text-primary opacity-60" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Start Your Learning Journey</h3>
                                    <p className="text-muted-foreground text-sm">Add your first subject and chapter to begin tracking!</p>
                                </div>
                                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2">
                                    <Plus className="w-4 h-4" /> Add Your First Chapter
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        filteredSubjects.map((subject, subIndex) => {
                            const color = getSubjectColor(subjects.indexOf(subject));
                            const progress = subjectProgress.find(s => s.subject === subject);
                            const subChapters = chaptersBySubject[subject] || [];

                            return (
                                <motion.div
                                    key={subject}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: subIndex * 0.1 }}
                                    className={`glass-card overflow-hidden border ${color.border}`}
                                >
                                    {/* Subject Header */}
                                    <div className={`p-4 bg-gradient-to-r ${color.bg}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl bg-background/50`}>
                                                    <Book className={`w-5 h-5 ${color.text}`} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">{subject}</h3>
                                                    <p className="text-xs text-muted-foreground">{subChapters.length} chapters</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <CircularProgress progress={progress?.progress || 0} size={48} strokeWidth={4} color={color.accent} />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-xs font-bold">{progress?.progress || 0}%</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1" onClick={() => startTimerForSubject(subject)}>
                                                        <Timer className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1" onClick={() => handleGetTips(subject)} disabled={loadingTips}>
                                                        <Lightbulb className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chapters Grid */}
                                    <div className="p-4 space-y-2">
                                        {subChapters.map((chapter, ci) => (
                                            <motion.div
                                                key={chapter.id}
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: ci * 0.05 }}
                                                className={`rounded-xl p-3 border transition-all hover:shadow-md ${getStatusBg(chapter.progress_percentage)}`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${chapter.progress_percentage >= 100 ? 'bg-green-400' : chapter.progress_percentage > 0 ? 'bg-amber-400' : 'bg-muted-foreground/30'}`} />
                                                        <span className="font-medium text-sm truncate">{chapter.chapter_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openScheduleDialog(chapter)} title="Schedule">
                                                            <CalendarPlus className="w-3.5 h-3.5 text-muted-foreground" />
                                                        </Button>
                                                        <Badge variant={chapter.status === "completed" ? "default" : "secondary"} className={`text-[10px] px-2 ${chapter.status === "completed" ? "bg-green-500/80" : ""}`}>
                                                            {chapter.status === "not-started" ? "New" : chapter.status === "in-progress" ? "Active" : "Done"}
                                                        </Badge>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteChapter.mutate(chapter.id)}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Slider value={[chapter.progress_percentage]} max={100} step={5} onValueChange={(v) => handleProgressChange(chapter, v)} className="flex-1" />
                                                    <span className={`text-sm font-mono font-medium w-10 text-right ${getStatusColor(chapter.progress_percentage)}`}>
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

                {/* ===== SCHEDULE SESSION DIALOG ===== */}
                <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CalendarPlus className="w-5 h-5 text-primary" /> Schedule Study Session
                            </DialogTitle>
                        </DialogHeader>
                        {selectedChapter && (
                            <div className="space-y-4 pt-4">
                                <div className="bg-secondary/50 p-3 rounded-lg border border-border">
                                    <p className="font-medium">{selectedChapter.subject}</p>
                                    <p className="text-sm text-muted-foreground">{selectedChapter.chapter_name}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Date</label>
                                    <Input type="date" value={scheduleData.due_date} onChange={(e) => setScheduleData({ ...scheduleData, due_date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Time (optional)</label>
                                    <Input type="time" value={scheduleData.start_time} onChange={(e) => setScheduleData({ ...scheduleData, start_time: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Duration</label>
                                    <Select value={scheduleData.duration} onValueChange={(v) => setScheduleData({ ...scheduleData, duration: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="30">30 minutes</SelectItem>
                                            <SelectItem value="45">45 minutes</SelectItem>
                                            <SelectItem value="60">1 hour</SelectItem>
                                            <SelectItem value="90">1.5 hours</SelectItem>
                                            <SelectItem value="120">2 hours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => { setScheduleData({ ...scheduleData, due_date: new Date().toISOString().split("T")[0] }); }}>Today</Button>
                                    <Button variant="outline" className="flex-1" onClick={() => { setScheduleData({ ...scheduleData, due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0] }); }}>Tomorrow</Button>
                                </div>
                                <Button onClick={handleScheduleSession} className="w-full" disabled={scheduling}>
                                    {scheduling ? "Scheduling..." : "Schedule Session →"}
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        </AppLayout>
    );
}

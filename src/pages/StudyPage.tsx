import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Book, GraduationCap, Trash2, Lightbulb, CalendarPlus, Clock, Play, Pause, RotateCcw } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo/SEO";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useStudy, StudyChapter } from "@/hooks/useStudy";
import { useTaskIntegration } from "@/hooks/useTaskIntegration";
import { getStudyTips } from "@/lib/groq";
import { useToast } from "@/hooks/use-toast";

export default function StudyPage() {
    const { chapters, subjects, chaptersBySubject, subjectProgress, isLoading, addChapter, updateProgress, deleteChapter } = useStudy();
    const { createStudyTask } = useTaskIntegration();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [timerDialogOpen, setTimerDialogOpen] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState<StudyChapter | null>(null);
    const [newChapter, setNewChapter] = useState({ subject: "", chapter_name: "" });
    const [scheduleData, setScheduleData] = useState({
        due_date: new Date().toISOString().split("T")[0],
        duration: "60",
        start_time: "",
    });
    const [aiTips, setAiTips] = useState<string | null>(null);
    const [loadingTips, setLoadingTips] = useState(false);
    const [scheduling, setScheduling] = useState(false);

    // Timer State
    const [timerActive, setTimerActive] = useState(false);
    const [timerTime, setTimerTime] = useState(25 * 60); // 25 minutes default
    const [timerDuration, setTimerDuration] = useState(25);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timerActive && timerTime > 0) {
            timerRef.current = setInterval(() => {
                setTimerTime((prev) => prev - 1);
            }, 1000);
        } else if (timerTime === 0) {
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            toast({
                title: "Session Complete! 🎉",
                description: "Great job focusing!",
            });
            // Optional: Auto-update progress lightly? 
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerActive, timerTime, toast]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => setTimerActive(!timerActive);
    const resetTimer = () => {
        setTimerActive(false);
        setTimerTime(timerDuration * 60);
    };

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
            toast({
                title: "Study session scheduled! 📚",
                description: `Task created for ${selectedChapter.chapter_name}`,
            });
            setScheduleDialogOpen(false);
            setSelectedChapter(null);
        } catch (error) {
            toast({
                title: "Failed to schedule",
                description: "Please try again",
                variant: "destructive",
            });
        }
        setScheduling(false);
    };

    const openScheduleDialog = (chapter: StudyChapter) => {
        setSelectedChapter(chapter);
        setScheduleData({
            due_date: new Date().toISOString().split("T")[0],
            duration: "60",
            start_time: "",
        });
        setScheduleDialogOpen(true);
    };

    const openTimerDialog = (chapter: StudyChapter) => {
        setSelectedChapter(chapter);
        setTimerDuration(25);
        setTimerTime(25 * 60);
        setTimerActive(false);
        setTimerDialogOpen(true);
    };

    const getStatusColor = (progress: number) => {
        if (progress >= 100) return "text-green-400";
        if (progress > 0) return "text-yellow-400";
        return "text-muted-foreground";
    };

    return (
        <AppLayout>
            <SEO title="Study Tracker" description="Track your academic progress, schedule study sessions, and use the focus timer." />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Study Tracker</h1>
                        <p className="text-muted-foreground">Track your learning progress by subject and chapter</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Chapter
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Study Chapter</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Input
                                    placeholder="Subject (e.g., Physics, Math)"
                                    value={newChapter.subject}
                                    onChange={(e) => setNewChapter({ ...newChapter, subject: e.target.value })}
                                />
                                <Input
                                    placeholder="Chapter name (e.g., Chapter 5: Waves)"
                                    value={newChapter.chapter_name}
                                    onChange={(e) => setNewChapter({ ...newChapter, chapter_name: e.target.value })}
                                />
                                <Button onClick={handleAddChapter} className="w-full" disabled={addChapter.isPending}>
                                    {addChapter.isPending ? "Adding..." : "Add Chapter"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Schedule Session Dialog */}
                <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CalendarPlus className="w-5 h-5 text-primary" />
                                Schedule Study Session
                            </DialogTitle>
                        </DialogHeader>
                        {selectedChapter && (
                            <div className="space-y-4 pt-4">
                                <div className="bg-secondary/50 p-3 rounded-lg">
                                    <p className="font-medium">{selectedChapter.subject}</p>
                                    <p className="text-sm text-muted-foreground">{selectedChapter.chapter_name}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Date</label>
                                    <Input
                                        type="date"
                                        value={scheduleData.due_date}
                                        onChange={(e) => setScheduleData({ ...scheduleData, due_date: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Time (optional)</label>
                                    <Input
                                        type="time"
                                        value={scheduleData.start_time}
                                        onChange={(e) => setScheduleData({ ...scheduleData, start_time: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Duration</label>
                                    <Select
                                        value={scheduleData.duration}
                                        onValueChange={(v) => setScheduleData({ ...scheduleData, duration: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
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
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            const today = new Date().toISOString().split("T")[0];
                                            setScheduleData({ ...scheduleData, due_date: today });
                                        }}
                                    >
                                        Today
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
                                            setScheduleData({ ...scheduleData, due_date: tomorrow });
                                        }}
                                    >
                                        Tomorrow
                                    </Button>
                                </div>

                                <Button onClick={handleScheduleSession} className="w-full" disabled={scheduling}>
                                    {scheduling ? "Scheduling..." : "Schedule Session →"}
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Focus Timer Dialog */}
                <Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Focus Timer
                            </DialogTitle>
                        </DialogHeader>
                        {selectedChapter && (
                            <div className="flex flex-col items-center space-y-6 py-4">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Focusing On</p>
                                    <h3 className="text-xl font-bold">{selectedChapter.chapter_name}</h3>
                                    <p className="text-primary">{selectedChapter.subject}</p>
                                </div>

                                <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-4 border-primary/20 bg-secondary/20">
                                    <div className="text-5xl font-mono font-bold tracking-tight">
                                        {formatTime(timerTime)}
                                    </div>
                                    {timerActive && (
                                        <motion.div
                                            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        />
                                    )}
                                </div>

                                <div className="flex items-center gap-4 w-full justify-center">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 rounded-full"
                                        onClick={resetTimer}
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        className="h-16 w-16 rounded-full shadow-lg shadow-primary/20"
                                        onClick={toggleTimer}
                                    >
                                        {timerActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                                    </Button>
                                </div>

                                {!timerActive && (
                                    <div className="w-full space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                                            <span>Duration</span>
                                            <span>{timerDuration} min</span>
                                        </div>
                                        <Slider
                                            value={[timerDuration]}
                                            min={5}
                                            max={120}
                                            step={5}
                                            onValueChange={(vals) => {
                                                setTimerDuration(vals[0]);
                                                setTimerTime(vals[0] * 60);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* AI Tips Card */}
                {aiTips && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-4 border-primary/50"
                    >
                        <div className="flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold mb-2">AI Study Tips</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiTips}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setAiTips(null)}>×</Button>
                        </div>
                    </motion.div>
                )}

                {/* Subject Progress Overview */}
                {subjectProgress.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {subjectProgress.map((subject, index) => (
                            <motion.div
                                key={subject.subject}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="glass-card p-4"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4 text-primary" />
                                        <span className="font-medium">{subject.subject}</span>
                                    </div>
                                    <Badge variant="secondary">{subject.chapters} ch</Badge>
                                </div>
                                <Progress value={subject.progress} className="h-2 mb-1" />
                                <p className={`text-sm ${getStatusColor(subject.progress)}`}>{subject.progress}% complete</p>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Chapters by Subject */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading study data...</div>
                    ) : subjects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No study chapters yet. Add your first chapter!
                        </div>
                    ) : (
                        <Accordion type="multiple" className="space-y-2">
                            {subjects.map((subject) => (
                                <AccordionItem key={subject} value={subject} className="glass-card border-none">
                                    <AccordionTrigger className="px-4 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <Book className="w-5 h-5 text-primary" />
                                            <span className="font-semibold">{subject}</span>
                                            <Badge variant="outline">{chaptersBySubject[subject].length} chapters</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="flex justify-end mb-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleGetTips(subject)}
                                                disabled={loadingTips}
                                                className="gap-2"
                                            >
                                                <Lightbulb className="w-4 h-4" />
                                                {loadingTips ? "Loading..." : "Get AI Tips"}
                                            </Button>
                                        </div>
                                        <div className="space-y-4">
                                            {chaptersBySubject[subject].map((chapter) => (
                                                <div key={chapter.id} className="bg-secondary/50 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium">{chapter.chapter_name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openTimerDialog(chapter)}
                                                                className="gap-1 h-7 px-2"
                                                            >
                                                                <Clock className="w-3 h-3" />
                                                                <span className="hidden sm:inline">Focus</span>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openScheduleDialog(chapter)}
                                                                className="gap-1 h-7 px-2"
                                                            >
                                                                <CalendarPlus className="w-3 h-3" />
                                                                <span className="hidden sm:inline">Schedule</span>
                                                            </Button>
                                                            <Badge
                                                                variant={chapter.status === "completed" ? "default" : "secondary"}
                                                                className={chapter.status === "completed" ? "bg-green-500" : ""}
                                                            >
                                                                {chapter.status}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => deleteChapter.mutate(chapter.id)}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Slider
                                                            value={[chapter.progress_percentage]}
                                                            max={100}
                                                            step={5}
                                                            onValueChange={(v) => handleProgressChange(chapter, v)}
                                                            className="flex-1"
                                                        />
                                                        <span className={`text-sm font-medium w-12 text-right ${getStatusColor(chapter.progress_percentage)}`}>
                                                            {chapter.progress_percentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
            </motion.div>
        </AppLayout>
    );
}


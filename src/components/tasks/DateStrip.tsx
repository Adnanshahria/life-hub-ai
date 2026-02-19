import { useRef, useEffect } from "react";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface DateStripProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    taskCounts: Record<string, { total: number; done: number }>; // key: YYYY-MM-DD
}

export function DateStrip({ selectedDate, onSelectDate, taskCounts }: DateStripProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const days: Date[] = [];

    // Generate range: -7 days to +14 days from Today
    const today = startOfDay(new Date());
    for (let i = -7; i <= 14; i++) {
        days.push(addDays(today, i));
    }

    // Scroll to selected date on mount or change
    useEffect(() => {
        if (scrollRef.current) {
            const index = days.findIndex(d => isSameDay(d, selectedDate));
            if (index !== -1) {
                const itemWidth = 64; // Width + Gap (approx)
                const centerOffset = scrollRef.current.clientWidth / 2 - itemWidth / 2;
                scrollRef.current.scrollTo({
                    left: index * itemWidth - centerOffset,
                    behavior: "smooth"
                });
            }
        }
    }, [selectedDate]);

    return (
        <div
            ref={scrollRef}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar px-4 py-4 mask-grad-right"
        >
            {days.map((date) => {
                const dateKey = format(date, "yyyy-MM-dd");
                const count = taskCounts[dateKey] || { total: 0, done: 0 };
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);

                // Completion Logic
                const isAllDone = count.total > 0 && count.done === count.total;
                const progress = count.total > 0 ? (count.done / count.total) * 100 : 0;

                // SVG Config
                const size = 48;
                const strokeWidth = 3;
                const radius = (size - strokeWidth) / 2;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (progress / 100) * circumference;

                return (
                    <div key={dateKey} className="flex flex-col items-center gap-1.5 shrink-0">
                        {/* Day Name */}
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isSelected ? "text-primary" : "text-muted-foreground/60"
                        )}>
                            {format(date, "EEE")}
                        </span>

                        {/* Circle Button */}
                        <button
                            onClick={() => onSelectDate(date)}
                            className={cn(
                                "relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300",
                                isAllDone && !isSelected
                                    ? "bg-green-500 text-white shadow-md shadow-green-500/20"
                                    : isSelected
                                        ? "bg-primary/10 text-primary scale-110"
                                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                            )}
                        >
                            {/* Selected Ring / Progress Ring */}
                            {isSelected && (
                                <svg className="absolute inset-0 -rotate-90 w-full h-full p-0.5">
                                    <circle
                                        cx="50%" cy="50%" r={radius}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={strokeWidth}
                                        strokeOpacity={0.2}
                                    />
                                    <circle
                                        cx="50%" cy="50%" r={radius}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className="transition-all duration-500 ease-out"
                                    />
                                </svg>
                            )}

                            {/* Date Number or Check */}
                            {isAllDone && !isSelected ? (
                                <Check className="w-6 h-6" strokeWidth={3} />
                            ) : (
                                <span className={cn("text-lg font-bold z-10", isSelected && "scale-90")}>
                                    {format(date, "d")}
                                </span>
                            )}

                            {/* Today Dot (if not selected/done) */}
                            {isToday && !isSelected && !isAllDone && (
                                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                            )}
                        </button>

                        {/* Count */}
                        <span className={cn(
                            "text-[10px] font-medium transition-colors",
                            isAllDone ? "text-green-500" : isSelected ? "text-primary" : "text-muted-foreground/50 ml-0.5"
                        )}>
                            {count.done}/{count.total}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

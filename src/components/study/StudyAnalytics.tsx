import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { StudyChapter } from "@/hooks/useStudy";
import { useMemo } from "react";

interface StudyAnalyticsProps {
    chapters: StudyChapter[];
}

export function StudyAnalytics({ chapters }: StudyAnalyticsProps) {
    const data = useMemo(() => {
        const subjects: Record<string, { total: number, completed: number, mastery: number }> = {};

        chapters.forEach(c => {
            if (!subjects[c.subject]) {
                subjects[c.subject] = { total: 0, completed: 0, mastery: 0 };
            }
            subjects[c.subject].total += 1;
            if (c.status === 'completed') subjects[c.subject].completed += 1;
            subjects[c.subject].mastery += (c.mastery_level || 0);
        });

        const barData = Object.keys(subjects).map(s => ({
            name: s,
            progress: Math.round((subjects[s].completed / subjects[s].total) * 100),
            mastery: Math.round(subjects[s].mastery / subjects[s].total)
        }));

        const statusData = [
            { name: "Completed", value: chapters.filter(c => c.status === 'completed').length, color: "#22c55e" },
            { name: "In Progress", value: chapters.filter(c => c.status === 'in-progress').length, color: "#3b82f6" },
            { name: "Not Started", value: chapters.filter(c => c.status === 'not-started').length, color: "#94a3b8" },
        ].filter(d => d.value > 0);

        return { barData, statusData };
    }, [chapters]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <div className="glass-card p-4">
                <h3 className="font-semibold mb-4">Subject Mastery</h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.barData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Progress %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-4">
                <h3 className="font-semibold mb-4">Overall Distribution</h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

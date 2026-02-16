import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
    Sparkles, Brain, ListTodo, Wallet, BookOpen, Target,
    ArrowRight, Zap, Shield, BarChart3, Clock, Flame,
    ChevronDown, Star, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";

// Floating particle component
function FloatingParticle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
    return (
        <motion.div
            className="absolute rounded-full bg-primary/20"
            style={{ left: x, top: y, width: size, height: size }}
            animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
            }}
            transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, delay, ease: "easeInOut" }}
        />
    );
}

// Feature card
function FeatureCard({ icon: Icon, title, description, gradient, delay }: {
    icon: any; title: string; description: string; gradient: string; delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            className="glass-card-hover p-6 group cursor-default"
        >
            <div className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </motion.div>
    );
}

// Stat counter
function StatCounter({ value, label, suffix = "" }: { value: string; label: string; suffix?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center"
        >
            <div className="text-4xl md:text-5xl font-bold text-gradient mb-1">{value}{suffix}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </motion.div>
    );
}

export default function WelcomePage() {
    const { scrollYProgress } = useScroll();
    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

    const features = [
        { icon: ListTodo, title: "Smart Tasks", description: "AI-powered task management with priority scoring, due dates, and automatic categorization.", gradient: "bg-gradient-to-br from-blue-500 to-blue-700" },
        { icon: Wallet, title: "Finance Tracker", description: "Track income, expenses, and budgets with beautiful charts. Set savings goals and watch them grow.", gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700" },
        { icon: BookOpen, title: "Study Hub", description: "Spaced repetition system, analytics dashboard, and focus timer. Master any subject efficiently.", gradient: "bg-gradient-to-br from-violet-500 to-violet-700" },
        { icon: Target, title: "Habit Tracker", description: "Build lasting habits with streak tracking, completion rates, and daily accountability.", gradient: "bg-gradient-to-br from-orange-500 to-orange-700" },
        { icon: Package, title: "Inventory Manager", description: "Track your belongings, purchases, and their values. AI-powered Smart Fill for quick entries.", gradient: "bg-gradient-to-br from-pink-500 to-pink-700" },
        { icon: Brain, title: "AI Assistant", description: "Nova, your personal AI, understands your data and provides contextual insights and suggestions.", gradient: "bg-gradient-to-br from-cyan-500 to-cyan-700" },
    ];

    return (
        <div className="min-h-screen bg-background overflow-hidden">
            <SEO title="Welcome to LifeOS" description="Your AI-powered personal operating system. Manage tasks, finances, studies, habits, and more — all in one place." />

            {/* ===== FLOATING PARTICLES BACKGROUND ===== */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <FloatingParticle delay={0} x="10%" y="20%" size={6} />
                <FloatingParticle delay={0.5} x="85%" y="15%" size={4} />
                <FloatingParticle delay={1} x="70%" y="60%" size={8} />
                <FloatingParticle delay={1.5} x="20%" y="70%" size={5} />
                <FloatingParticle delay={2} x="50%" y="40%" size={7} />
                <FloatingParticle delay={2.5} x="90%" y="80%" size={4} />
                <FloatingParticle delay={0.8} x="30%" y="85%" size={6} />
                <FloatingParticle delay={1.2} x="60%" y="10%" size={5} />
                {/* Large ambient glow blobs */}
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[150px]" />
            </div>

            {/* ===== NAVBAR ===== */}
            <motion.nav
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-border/50"
                style={{ background: "hsl(var(--background) / 0.8)" }}
            >
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-background" />
                        </div>
                        <span className="text-xl font-bold text-gradient">LifeOS</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                Sign In
                            </Button>
                        </Link>
                        <Link to="/register">
                            <Button size="sm" className="bg-gradient-primary text-background font-semibold hover:opacity-90 transition-opacity">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.nav>

            {/* ===== HERO SECTION ===== */}
            <motion.section
                style={{ opacity: heroOpacity, scale: heroScale }}
                className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16"
            >
                {/* Animated badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-muted-foreground mb-8"
                >
                    <Zap className="w-4 h-4 text-primary" />
                    <span>AI-Powered Personal OS</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">v2.0</span>
                </motion.div>

                {/* Main heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-bold text-center max-w-5xl leading-[1.1] mb-6"
                >
                    Your Life,{" "}
                    <span className="text-gradient">Supercharged</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-10 leading-relaxed"
                >
                    Manage your tasks, finances, studies, and habits — all in one beautiful,
                    AI-powered workspace. Meet <span className="text-primary font-medium">Nova</span>, your personal assistant.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col sm:flex-row gap-4 mb-16"
                >
                    <Link to="/register">
                        <Button size="lg" className="bg-gradient-primary text-background font-semibold text-lg px-8 h-14 hover:opacity-90 transition-all hover:scale-105 glow-primary">
                            Start Free <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                    <Link to="/login">
                        <Button size="lg" variant="outline" className="text-lg px-8 h-14 hover:bg-secondary transition-all">
                            Sign In
                        </Button>
                    </Link>
                </motion.div>

                {/* Hero visual - Mock dashboard preview */}
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.8, type: "spring", bounce: 0.3 }}
                    className="relative w-full max-w-4xl"
                >
                    <div className="glass-card p-6 md:p-8 relative overflow-hidden">
                        {/* Gradient border glow */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 pointer-events-none" />

                        {/* Mock Dashboard Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                            {[
                                { label: "Tasks Done", value: "24", icon: ListTodo, color: "text-blue-400" },
                                { label: "Budget Left", value: "৳12.5K", icon: Wallet, color: "text-emerald-400" },
                                { label: "Study Hours", value: "8.5h", icon: BookOpen, color: "text-violet-400" },
                                { label: "Streak", value: "15🔥", icon: Flame, color: "text-orange-400" },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 1.2 + i * 0.1 }}
                                    className="glass-card p-4 text-center"
                                >
                                    <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
                                    <div className="text-xl md:text-2xl font-bold text-foreground">{item.value}</div>
                                    <div className="text-xs text-muted-foreground">{item.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Mock progress bars */}
                        <div className="space-y-3">
                            {[
                                { label: "Weekly Goals", progress: 78, color: "from-cyan-400 to-blue-500" },
                                { label: "Savings Target", progress: 62, color: "from-emerald-400 to-green-500" },
                            ].map((bar) => (
                                <div key={bar.label} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-24 shrink-0">{bar.label}</span>
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${bar.progress}%` }}
                                            transition={{ delay: 1.5, duration: 1, ease: "easeOut" }}
                                            className={`h-full rounded-full bg-gradient-to-r ${bar.color}`}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-10 text-right">{bar.progress}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="absolute bottom-8 flex flex-col items-center gap-1"
                >
                    <span className="text-xs text-muted-foreground">Scroll to explore</span>
                    <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* ===== STATS SECTION ===== */}
            <section className="relative py-20 px-6">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    <StatCounter value="7" label="Modules" suffix="+" />
                    <StatCounter value="AI" label="Powered Assistant" />
                    <StatCounter value="100" label="Free to Use" suffix="%" />
                    <StatCounter value="24/7" label="Access Anywhere" />
                </div>
            </section>

            {/* ===== FEATURES SECTION ===== */}
            <section className="relative py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                            <Star className="w-4 h-4" /> Features
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            Everything you need,{" "}
                            <span className="text-gradient">one place</span>
                        </h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            A complete personal operating system designed to help you stay organized, productive, and focused.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <FeatureCard key={feature.title} {...feature} delay={i * 0.1} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== AI HIGHLIGHT SECTION ===== */}
            <section className="relative py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="glass-card p-8 md:p-12 relative overflow-hidden"
                    >
                        {/* Background glow */}
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px]" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                                    <Brain className="w-4 h-4" /> Meet Nova
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                    Your AI that <span className="text-gradient">actually knows you</span>
                                </h2>
                                <p className="text-muted-foreground mb-6 leading-relaxed">
                                    Nova isn't just a chatbot. It understands your tasks, tracks your spending patterns,
                                    knows your study schedule, and proactively suggests actions. It's the smartest assistant
                                    you've ever had.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {["Smart Fill Forms", "Contextual Tips", "Data Insights", "Proactive Alerts"].map((tag) => (
                                        <span key={tag} className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* AI Visual */}
                            <div className="w-48 h-48 md:w-56 md:h-56 relative shrink-0">
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-full h-full rounded-3xl bg-gradient-primary flex items-center justify-center relative"
                                >
                                    <Brain className="w-20 h-20 text-background" />
                                    {/* Orbit dots */}
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-[-12px]"
                                    >
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary animate-pulse-glow" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ rotate: -360 }}
                                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-[-24px]"
                                    >
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary/60" />
                                    </motion.div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ===== WHY LIFEOS SECTION ===== */}
            <section className="relative py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            Why <span className="text-gradient">LifeOS</span>?
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: Shield, title: "Privacy First", description: "Your data stays yours. Secure database, no third-party sharing.", color: "text-emerald-400" },
                            { icon: Clock, title: "Save Hours Weekly", description: "Automate tracking, get AI insights, and never lose track of your life.", color: "text-blue-400" },
                            { icon: BarChart3, title: "Beautiful Analytics", description: "Stunning charts and visualizations that make data a joy to explore.", color: "text-violet-400" },
                        ].map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="text-center p-8"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
                                    <item.icon className={`w-8 h-8 ${item.color}`} />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                                <p className="text-muted-foreground text-sm">{item.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== CTA SECTION ===== */}
            <section className="relative py-24 px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <div className="glass-card p-10 md:p-16 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 pointer-events-none" />
                        <div className="relative z-10">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="inline-block mb-6"
                            >
                                <Sparkles className="w-12 h-12 text-primary" />
                            </motion.div>
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">
                                Ready to <span className="text-gradient">level up</span>?
                            </h2>
                            <p className="text-muted-foreground mb-8 text-lg">
                                Join LifeOS today and take control of your life with the power of AI.
                            </p>
                            <Link to="/register">
                                <Button size="lg" className="bg-gradient-primary text-background font-semibold text-lg px-10 h-14 hover:opacity-90 transition-all hover:scale-105 glow-primary">
                                    Get Started — It's Free <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="relative py-8 px-6 border-t border-border/30">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-background" />
                        </div>
                        <span className="font-semibold text-gradient">LifeOS</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} LifeOS. Built with ❤️ and AI.
                    </p>
                </div>
            </footer>
        </div>
    );
}

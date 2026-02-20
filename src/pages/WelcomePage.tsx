import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import {
    Sparkles, Brain, ListTodo, Wallet, BookOpen, Target,
    ArrowRight, Zap, Shield, BarChart3, Clock, Flame,
    ChevronDown, Star, Package, Sun, Moon, Snowflake,
    Gauge, WifiOff, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/data/translations";

// ❄️ Snowflake particle — falls from top with gentle sway
function SnowParticle({ delay, startX, size, duration, drift }: {
    delay: number; startX: number; size: number; duration: number; drift: number;
}) {
    return (
        <motion.div
            className="absolute top-0 rounded-full pointer-events-none"
            style={{
                left: `${startX}%`,
                width: size,
                height: size,
                background: `radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(200, 230, 255, 0.4) 100%)`,
                boxShadow: `0 0 ${size * 2}px rgba(180, 220, 255, 0.3)`,
            }}
            animate={{
                y: ["0vh", "105vh"],
                x: [0, drift, -drift * 0.5, drift * 0.7, 0],
                opacity: [0, 1, 1, 1, 0],
                rotate: [0, 360],
            }}
            transition={{
                duration,
                repeat: Infinity,
                delay,
                ease: "linear",
                x: { duration: duration * 0.8, repeat: Infinity, ease: "easeInOut" },
            }}
        />
    );
}

// ❄️ Snowfall layer — generates many snowflakes
function SnowfallLayer() {
    const snowflakes = useMemo(() =>
        Array.from({ length: 35 }, (_, i) => ({
            id: i,
            delay: Math.random() * 12,
            startX: Math.random() * 100,
            size: 2 + Math.random() * 5,
            duration: 8 + Math.random() * 10,
            drift: 15 + Math.random() * 30,
        })), []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
            {snowflakes.map((flake) => (
                <SnowParticle key={flake.id} {...flake} />
            ))}
        </div>
    );
}

// Feature card with frost hover
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
            className="glass-card-hover p-6 group cursor-default frost-card"
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
            <div className="text-4xl md:text-5xl font-bold text-gradient-ice mb-1">{value}{suffix}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </motion.div>
    );
}

export default function WelcomePage() {
    const { theme, toggleTheme } = useTheme();
    const { language, toggleLanguage } = useLanguage();
    const t = translations[language];
    const { scrollYProgress } = useScroll();
    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
    const [activeSection, setActiveSection] = useState<string>('');

    // Scroll spy — track which section is in view
    useEffect(() => {
        const sectionIds = ['features', 'orbit-ai', 'why'];
        const observers: IntersectionObserver[] = [];

        sectionIds.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveSection(id);
                },
                { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
            );
            observer.observe(el);
            observers.push(observer);
        });

        return () => observers.forEach((o) => o.disconnect());
    }, []);

    const features = [
        { icon: ListTodo, title: t.features.list[0].title, description: t.features.list[0].desc, gradient: "bg-gradient-to-br from-sky-400 to-blue-600" },
        { icon: Wallet, title: t.features.list[1].title, description: t.features.list[1].desc, gradient: "bg-gradient-to-br from-teal-400 to-cyan-600" },
        { icon: BookOpen, title: t.features.list[2].title, description: t.features.list[2].desc, gradient: "bg-gradient-to-br from-indigo-400 to-violet-600" },
        { icon: Target, title: t.features.list[3].title, description: t.features.list[3].desc, gradient: "bg-gradient-to-br from-cyan-400 to-blue-500" },
        { icon: Package, title: t.features.list[4].title, description: t.features.list[4].desc, gradient: "bg-gradient-to-br from-blue-400 to-indigo-600" },
        { icon: Brain, title: t.features.list[5].title, description: t.features.list[5].desc, gradient: "bg-gradient-to-br from-slate-400 to-sky-600" },
    ];

    return (
        <div className="min-h-screen bg-background overflow-hidden">
            <SEO title="Welcome to LifeSolver" description="Your AI-powered personal operating system. Manage tasks, finances, studies, habits, and more — all in one place." />

            {/* ===== SNOWFALL (Dark Mode Only) ===== */}
            {theme === 'dark' && <SnowfallLayer />}

            {/* ===== ICE ATMOSPHERE BACKGROUND (Dark Mode Only) ===== */}
            {theme === 'dark' && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    {/* Aurora-like ice glow blobs */}
                    <div className="absolute -top-32 left-1/4 w-[700px] h-[700px] rounded-full blur-[160px]"
                        style={{ background: "radial-gradient(circle, rgba(77,208,225,0.12) 0%, transparent 70%)" }} />
                    <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full blur-[120px]"
                        style={{ background: "radial-gradient(circle, rgba(128,222,234,0.08) 0%, transparent 70%)" }} />
                    <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full blur-[140px]"
                        style={{ background: "radial-gradient(circle, rgba(176,190,255,0.1) 0%, transparent 70%)" }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[180px]"
                        style={{ background: "radial-gradient(circle, rgba(200,230,255,0.05) 0%, transparent 60%)" }} />
                </div>
            )}

            {/* ===== SKY ATMOSPHERE BACKGROUND (Light Mode Only) ===== */}
            {theme === 'light' && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-40 left-1/4 w-[800px] h-[800px] rounded-full blur-[180px]"
                        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)" }} />
                    <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full blur-[140px]"
                        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)" }} />
                    <div className="absolute bottom-0 left-1/2 w-[700px] h-[700px] rounded-full blur-[160px]"
                        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)" }} />
                </div>
            )}

            {/* ===== NAVBAR — Rounded Pill ===== */}
            <motion.nav
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
                className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
            >
                <div className="glass-card rounded-full px-5 md:px-6 py-2.5 flex items-center gap-6 shadow-lg shadow-sky-900/5 border border-sky-300/15 dark:border-sky-400/10 backdrop-blur-xl">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                            <img src="/logo.svg" alt="LifeSolver Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">LifeSolver</span>
                    </div>

                    {/* Center Links (Desktop) */}
                    <div className="hidden md:flex items-center gap-1 bg-secondary/40 rounded-full px-1.5 py-1 border border-white/5">
                        {[t.nav.features, t.nav.orbit, t.nav.why].map((item, index) => {
                            // Map translated items back to IDs for scroll spy
                            const ids = ['features', 'orbit-ai', 'why'];
                            const id = ids[index];
                            const isActive = activeSection === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => {
                                        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-300 ${isActive
                                        ? 'bg-gradient-to-r from-sky-400 to-cyan-500 text-white shadow-md shadow-sky-500/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                                        } `}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleLanguage}
                            className="p-2 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors font-medium text-xs"
                            aria-label="Toggle language"
                        >
                            {language.toUpperCase()}
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                        </button>
                        <div className="h-5 w-px bg-border/40 hidden md:block" />
                        <Link to="/register">
                            <Button size="sm" className="rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-md shadow-sky-500/20 px-5">
                                {t.nav.getStarted}
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-muted-foreground mb-8 border-sky-300/20 dark:border-sky-400/15"
                >
                    <Snowflake className="w-4 h-4 text-sky-400" />
                    <span>{t.hero.badge}</span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-400 text-xs font-medium">v2.0</span>
                </motion.div>

                {/* Main heading */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.7, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.4 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black text-center max-w-5xl leading-[1.1] mb-6"
                >
                    {t.hero.titlePre}<span className="text-gradient-ice">{t.hero.titlePost}</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-10 leading-relaxed"
                >
                    {t.hero.subtitle}
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col sm:flex-row gap-4 mb-16"
                >
                    <Link to="/register">
                        <Button size="lg" className="bg-gradient-to-r from-sky-400 to-cyan-500 text-white font-semibold text-lg px-8 h-14 hover:opacity-90 transition-all hover:scale-105 shadow-xl shadow-sky-500/25">
                            {t.hero.ctaStart} <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                    <Link to="/login">
                        <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-sky-300/30 dark:border-sky-400/20 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all">
                            {t.hero.ctaLogin}
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
                    <div className="glass-card p-6 md:p-8 relative overflow-hidden frost-card">
                        {/* Frost border glow */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400/15 via-transparent to-cyan-400/15 pointer-events-none" />

                        {/* Mock Dashboard Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                            {[
                                { label: t.stats.tasks, value: "24", icon: ListTodo, color: "text-sky-400" },
                                { label: t.stats.budget, value: "৳12.5K", icon: Wallet, color: "text-teal-400" },
                                { label: t.stats.study, value: "8.5h", icon: BookOpen, color: "text-indigo-400" },
                                { label: t.stats.streak, value: "15🔥", icon: Flame, color: "text-cyan-400" },
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
                                { label: t.stats.goals, progress: 78, color: "from-sky-400 to-blue-500" },
                                { label: t.stats.savings, progress: 62, color: "from-teal-400 to-cyan-500" },
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
                    <span className="text-xs text-muted-foreground">{t.hero.scroll}</span>
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
            <section id="features" className="relative py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/10 text-sky-400 text-sm font-medium mb-4">
                            <Star className="w-4 h-4" /> {t.features.badge}
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            {t.features.title}
                            <span className="text-gradient-ice">{t.features.titleHighlight}</span>
                        </h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            {t.features.desc}
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
            <section id="orbit-ai" className="relative py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-400/10 text-indigo-400 text-sm font-medium mb-4 border border-indigo-400/20">
                            <Sparkles className="w-4 h-4" /> {t.ai.badge}
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            {t.ai.title}
                            <span className="text-gradient-ice">{t.ai.titleHighlight}</span>
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                            {t.ai.desc}
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Left — Mock Chat Interface */}
                        <motion.div
                            initial={{ opacity: 0, x: -40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="glass-card p-1 relative overflow-hidden frost-card"
                        >
                            {/* Chat window chrome */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-sky-200/10 dark:border-sky-400/10">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                                </div>
                                <div className="flex-1 text-center">
                                    <span className="text-xs text-muted-foreground font-medium">Orbit AI</span>
                                </div>
                                <Brain className="w-4 h-4 text-sky-400" />
                            </div>

                            {/* Chat messages */}
                            <div className="p-4 space-y-4 min-h-[320px]">
                                {/* User message */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.3 }}
                                    className="flex justify-end"
                                >
                                    <div className="bg-gradient-to-r from-sky-400 to-cyan-500 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%] text-sm shadow-md shadow-sky-500/10">
                                        {language === 'bn' ? 'আমার এই মাসের বাজেট কেমন চলছে?' : "How's my budget looking this month?"}
                                    </div>
                                </motion.div>

                                {/* AI response */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.6 }}
                                    className="flex justify-start gap-2"
                                >
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center shrink-0 mt-1">
                                        <Brain className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%] text-sm leading-relaxed">
                                        <p className="text-foreground mb-2">
                                            {language === 'bn' ? 'তুমি ৳12,500 এর মধ্যে ৳8,200 খরচ করেছ।' : "You've spent ৳8,200 of your ৳12,500 budget."}
                                        </p>
                                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: '66%' }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.8, duration: 0.8 }}
                                                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500"
                                            />
                                        </div>
                                        <p className="text-muted-foreground text-xs">
                                            {language === 'bn' ? '💡 পরামর্শ: খাবারে এই সপ্তাহে ৳1,200 বাঁচাতে পারো।' : '💡 Tip: You could save ৳1,200 on food this week.'}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Second user message */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.9 }}
                                    className="flex justify-end"
                                >
                                    <div className="bg-gradient-to-r from-sky-400 to-cyan-500 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%] text-sm shadow-md shadow-sky-500/10">
                                        {language === 'bn' ? 'আমার কাল কী কী করা দরকার?' : 'What do I need to do tomorrow?'}
                                    </div>
                                </motion.div>

                                {/* AI response 2 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 1.2 }}
                                    className="flex justify-start gap-2"
                                >
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center shrink-0 mt-1">
                                        <Brain className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%] text-sm">
                                        <p className="text-foreground mb-1.5">
                                            {language === 'bn' ? 'তোমার কালকের ৩টি কাজ আছে:' : "You have 3 tasks for tomorrow:"}
                                        </p>
                                        <div className="space-y-1">
                                            {[
                                                { icon: '📝', text: language === 'bn' ? 'ফিজিক্স অ্যাসাইনমেন্ট জমা দাও' : 'Submit Physics assignment' },
                                                { icon: '💰', text: language === 'bn' ? 'ফ্রিল্যান্স ইনভয়েস পাঠাও' : 'Send freelance invoice' },
                                                { icon: '🏃', text: language === 'bn' ? 'সন্ধ্যা ৫টায় জিম' : 'Gym at 5 PM' },
                                            ].map((task) => (
                                                <div key={task.text} className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="text-xs">{task.icon}</span>
                                                    <span className="text-xs">{task.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Chat input */}
                            <div className="px-4 pb-4">
                                <div className="glass-card rounded-full px-4 py-2.5 flex items-center gap-2 border border-sky-200/15 dark:border-sky-400/10">
                                    <span className="text-muted-foreground text-sm flex-1">{language === 'bn' ? 'অরবিটকে কিছু জিজ্ঞেস করো...' : 'Ask Orbit anything...'}</span>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 flex items-center justify-center">
                                        <ArrowRight className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right — Capability cards */}
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="grid grid-cols-2 gap-4"
                        >
                            {[
                                { icon: Brain, label: t.ai.tags[0], desc: language === 'bn' ? 'বুদ্ধিমান ফর্ম পূরণ' : 'Context-aware assistance', gradient: 'from-indigo-500 to-violet-500', glow: 'shadow-indigo-500/20' },
                                { icon: BarChart3, label: t.ai.tags[1], desc: language === 'bn' ? 'তথ্য বিশ্লেষণ' : 'Smart analytics & reports', gradient: 'from-sky-400 to-cyan-500', glow: 'shadow-sky-500/20' },
                                { icon: Zap, label: t.ai.tags[2], desc: language === 'bn' ? 'প্রেক্ষাপট সচেতন পরামর্শ' : 'Personalized suggestions', gradient: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/20' },
                                { icon: Clock, label: t.ai.tags[3], desc: language === 'bn' ? 'সক্রিয় বিজ্ঞপ্তি' : 'Timely notifications', gradient: 'from-teal-400 to-emerald-500', glow: 'shadow-teal-500/20' },
                            ].map((cap, i) => (
                                <motion.div
                                    key={cap.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 + i * 0.15 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    className="glass-card p-5 frost-card group cursor-default"
                                >
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center mb-3 shadow-lg ${cap.glow} group-hover:scale-110 transition-transform duration-300`}>
                                        <cap.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <h4 className="font-semibold text-foreground text-sm mb-1">{cap.label}</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
                                </motion.div>
                            ))}

                            {/* Bottom wide card — AI stats */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 1 }}
                                className="col-span-2 glass-card p-5 frost-card"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-foreground">{language === 'bn' ? 'অরবিট AI স্ট্যাটাস' : 'Orbit AI Status'}</div>
                                            <div className="text-xs text-muted-foreground">{language === 'bn' ? 'সর্বদা শিখছে, সর্বদা উন্নত হচ্ছে' : 'Always learning, always improving'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-xs font-medium text-emerald-400">{language === 'bn' ? 'সক্রিয়' : 'Active'}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            <section id="why" className="relative py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            {t.why.title} <span className="text-gradient-ice">{t.why.titleHighlight}</span>?
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: Shield, title: t.why.cards[0].title, description: t.why.cards[0].desc, color: "text-teal-400" },
                            { icon: ListTodo, title: t.why.cards[1].title, description: t.why.cards[1].desc, color: "text-sky-400" },
                            { icon: Zap, title: t.why.cards[2].title, description: t.why.cards[2].desc, color: "text-indigo-400" },
                            { icon: Gauge, title: t.why.cards[3].title, description: t.why.cards[3].desc, color: "text-amber-400" },
                            { icon: WifiOff, title: t.why.cards[4].title, description: t.why.cards[4].desc, color: "text-rose-400" },
                            { icon: Download, title: t.why.cards[5].title, description: t.why.cards[5].desc, color: "text-emerald-400" },
                        ].map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="text-center p-8 frost-card glass-card rounded-xl"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-sky-400/10 dark:bg-sky-950/40 flex items-center justify-center mx-auto mb-5 border border-sky-300/20 dark:border-sky-400/10">
                                    <item.icon className={`w-8 h-8 ${item.color}`} />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
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
                    <div className="glass-card p-10 md:p-16 relative overflow-hidden frost-card">
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-400/5 to-cyan-400/10 pointer-events-none" />
                        <div className="relative z-10">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="inline-block mb-6"
                            >
                                <img src="/logo.svg" alt="LifeSolver" className="w-12 h-12" />
                            </motion.div>
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">
                                {t.cta.title} <span className="text-gradient-ice">{t.cta.titleHighlight}</span>?
                            </h2>
                            <p className="text-muted-foreground mb-8 text-lg">
                                {t.cta.desc}
                            </p>
                            <Link to="/register">
                                <Button size="lg" className="bg-gradient-to-r from-sky-400 to-cyan-500 text-white font-semibold text-lg px-10 h-14 hover:opacity-90 transition-all hover:scale-105 shadow-xl shadow-sky-500/25">
                                    {t.cta.button} <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </section>

            <footer className="relative py-8 px-6 border-t border-sky-200/20 dark:border-sky-400/10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center overflow-hidden">
                            <img src="/logo.svg" alt="LifeSolver Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-gradient-ice">LifeSolver</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} LifeSolver. Built with ❄️ and AI.
                    </p>
                </div >
            </footer >
        </div >
    );
}

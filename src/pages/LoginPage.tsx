import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Sparkles, ArrowRight, Shield, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/seo/SEO";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return;
        setIsLoading(true);
        setError("");
        const result = await googleLogin(credentialResponse.credential);
        if (result.success) {
            navigate(from, { replace: true });
        } else {
            setError(result.error || "Google login failed");
        }
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate(from, { replace: true });
        } else if (result.requiresVerification) {
            navigate(`/verify-otp?email=${encodeURIComponent(email)}`, { replace: true });
        } else {
            setError(result.error || "Login failed");
        }

        setIsLoading(false);
    };

    const features = [
        { icon: Brain, title: "AI-Powered", desc: "Smart task management" },
        { icon: Zap, title: "Lightning Fast", desc: "Instant sync everywhere" },
        { icon: Shield, title: "Privacy First", desc: "Your data stays yours" },
    ];

    return (
        <div className="min-h-screen flex bg-background">
            <SEO title="Login" description="Sign in to LifeSolver to access your dashboard." />

            {/* Left Branding Panel — hidden on mobile */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden flex-col justify-between p-10">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-blue-600" />
                <div className="absolute inset-0">
                    <motion.div
                        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-2xl"
                    />
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                            <img src="/logo.svg" alt="LifeSolver" className="w-7 h-7" />
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">LifeSolver</span>
                    </motion.div>
                </div>

                <div className="relative z-10 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                            Welcome back to<br />
                            <span className="text-white/80">your command center.</span>
                        </h2>
                        <p className="text-white/60 text-lg mt-4 max-w-md">
                            Manage your life with AI-powered tools. Tasks, finances, notes, and more — all in one place.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex gap-6"
                    >
                        {features.map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                    <f.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-semibold">{f.title}</p>
                                    <p className="text-white/50 text-xs">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="relative z-10">
                    <p className="text-white/40 text-sm">© 2026 LifeSolver. All rights reserved.</p>
                </div>
            </div>

            {/* Right Form Panel */}
            <div className="flex-1 flex items-start lg:items-center justify-center px-4 py-6 sm:p-8 relative overflow-y-auto min-h-screen lg:min-h-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', paddingTop: 'env(safe-area-inset-top, 16px)' }}>
                {/* Mobile-only background blobs */}
                <div className="lg:hidden fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[420px] relative z-10 my-auto py-2"
                >
                    {/* Header Card */}
                    <div className="rounded-2xl sm:rounded-3xl border border-violet-300/60 dark:border-violet-500/30 bg-card/60 backdrop-blur-sm p-4 sm:p-6 shadow-sm mb-3 sm:mb-4">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-4 sm:mb-5">
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="inline-flex items-center gap-2.5 mb-3"
                            >
                                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                                    <img src="/logo.svg" alt="LifeSolver" className="w-7 h-7 object-contain" />
                                </div>
                                <span className="text-2xl sm:text-3xl font-bold text-blue-800 dark:text-blue-400">LifeSolver</span>
                            </motion.div>
                        </div>

                        {/* Title */}
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Sign in</h1>
                            <p className="text-muted-foreground mt-1 sm:mt-1.5 text-sm sm:text-base">Welcome back! Enter your credentials to continue.</p>
                        </div>
                    </div>

                    {/* Google Card */}
                    <div className="rounded-2xl sm:rounded-3xl border border-violet-300/60 dark:border-violet-500/30 bg-card/60 backdrop-blur-sm p-4 sm:p-5 shadow-sm mb-3 sm:mb-4">
                        <div className="relative h-12 w-full rounded-full overflow-hidden">
                            {/* Custom visual button (no pointer events — clicks pass through) */}
                            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center gap-3 rounded-full bg-foreground text-background font-semibold text-sm border border-border/20 shadow-sm">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </div>
                            {/* Real Google button — invisible but receives clicks */}
                            <div className="absolute inset-0 z-20 opacity-0 cursor-pointer [&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full [&_div[role=button]]:!h-full">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError("Google Sign In Failed")}
                                    useOneTap
                                    shape="rectangular"
                                    theme="filled_black"
                                    size="large"
                                    width="400"
                                    ux_mode="redirect"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative mb-3 sm:mb-5">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-violet-200/60 dark:border-violet-500/20" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-3 text-muted-foreground font-medium tracking-wider">
                                or sign in with email
                            </span>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="rounded-2xl sm:rounded-3xl border border-violet-300/60 dark:border-violet-500/30 bg-card/60 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 px-5"
                                >
                                    <div className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="h-11 sm:h-12 rounded-full bg-background border-border/50 focus:border-primary transition-colors px-4 sm:px-5 text-sm sm:text-base"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                                    <Link to="/forgot-password" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="h-11 sm:h-12 pr-12 rounded-full bg-background border-border/50 focus:border-primary transition-colors px-4 sm:px-5 text-sm sm:text-base"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary/50"
                                    >
                                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                    </button>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base rounded-full font-semibold group bg-blue-800 hover:bg-blue-900 text-white" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>

                    <div className="flex justify-center mt-3 sm:mt-5">
                        <Link to="/register" className="inline-flex items-center gap-2 sm:gap-2.5 rounded-full bg-blue-800 hover:bg-blue-900 py-2.5 sm:py-3 px-4 sm:px-5 text-xs sm:text-sm font-medium text-white/80 transition-colors shadow-sm">
                            Don't have an account?
                            <span className="bg-white text-blue-800 font-semibold px-3 py-1 rounded-full text-xs">Create one</span>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

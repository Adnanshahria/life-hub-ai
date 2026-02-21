import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Sparkles, Check, X, ArrowRight, Rocket, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/seo/SEO";
import { GoogleLogin } from "@react-oauth/google";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { register, googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return;
        setIsLoading(true);
        setError("");
        const result = await googleLogin(credentialResponse.credential);
        if (result.success) {
            navigate("/", { replace: true });
        } else {
            setError(result.error || "Google registration failed");
        }
        setIsLoading(false);
    };

    // Password strength checks
    const passwordChecks = {
        length: password.length >= 6,
        match: password === confirmPassword && confirmPassword.length > 0,
    };

    const canSubmit = name && email && password && passwordChecks.length && passwordChecks.match;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!passwordChecks.length) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (!passwordChecks.match) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);

        const result = await register(name, email, password);

        if (result.success) {
            navigate(`/verify-otp?email=${encodeURIComponent(email)}`, { replace: true });
        } else {
            setError(result.error || "Registration failed");
        }

        setIsLoading(false);
    };

    const highlights = [
        { icon: Rocket, title: "Get Started Fast", desc: "Set up in under 2 minutes" },
        { icon: Star, title: "Free Forever", desc: "Core features always free" },
        { icon: Users, title: "Join 1K+ Users", desc: "Growing community" },
    ];

    return (
        <div className="min-h-screen flex bg-background">
            <SEO title="Register" description="Create a new LifeSolver account to get started." />

            {/* Left Branding Panel — hidden on mobile */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden flex-col justify-between p-10">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-primary to-blue-600" />
                <div className="absolute inset-0">
                    <motion.div
                        animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
                        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-16 right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
                        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-24 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/2 left-1/3 w-56 h-56 bg-white/10 rounded-full blur-2xl"
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
                            Start organizing<br />
                            <span className="text-white/80">your life today.</span>
                        </h2>
                        <p className="text-white/60 text-lg mt-4 max-w-md">
                            Join LifeSolver and let AI handle the complexity. Focus on what matters most to you.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex gap-6"
                    >
                        {highlights.map((f, i) => (
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
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative overflow-y-auto">
                {/* Mobile-only background blobs */}
                <div className="lg:hidden fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[420px] relative z-10 my-auto"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center gap-2.5 mb-3"
                        >
                            <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-3xl font-bold text-gradient">LifeSolver</span>
                        </motion.div>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create account</h1>
                        <p className="text-muted-foreground mt-1.5">Fill in your details to get started.</p>
                    </div>

                    {/* Google Button First */}
                    <div className="mb-6">
                        <div className="flex justify-center w-full [&>div]:!w-full [&_iframe]:!w-full">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError("Google Registration Failed")}
                                useOneTap
                                shape="rectangular"
                                theme="filled_black"
                                size="large"
                                width="400"
                                ux_mode="redirect"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-3 text-muted-foreground font-medium tracking-wider">
                                or register with email
                            </span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Adnan Shahria"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoComplete="name"
                                className="h-12 rounded-xl bg-secondary/30 border-border/50 focus:border-primary transition-colors"
                            />
                        </div>

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
                                className="h-12 rounded-xl bg-secondary/30 border-border/50 focus:border-primary transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="h-12 pr-12 rounded-xl bg-secondary/30 border-border/50 focus:border-primary transition-colors"
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

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                className="h-12 rounded-xl bg-secondary/30 border-border/50 focus:border-primary transition-colors"
                            />
                        </div>

                        {/* Password Strength Indicators */}
                        {password && (
                            <div className="space-y-1.5 pt-1">
                                <div className={`flex items-center gap-2 text-sm ${passwordChecks.length ? "text-emerald-500" : "text-muted-foreground"}`}>
                                    {passwordChecks.length ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    <span>At least 6 characters</span>
                                </div>
                                {confirmPassword && (
                                    <div className={`flex items-center gap-2 text-sm ${passwordChecks.match ? "text-emerald-500" : "text-red-400"}`}>
                                        {passwordChecks.match ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        <span>Passwords match</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-12 text-base rounded-xl font-semibold group mt-2" disabled={isLoading || !canSubmit}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                            Sign in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

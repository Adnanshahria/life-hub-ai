import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, User, Palette, Globe, Bell, DollarSign, LogOut, Save } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { DEFAULT_USER_ID } from "@/lib/turso";
import { SEO } from "@/components/seo/SEO";

export default function SettingsPage() {
    const { settings, isLoading, updateSettings } = useSettings();
    const [monthlyBudget, setMonthlyBudget] = useState("");
    const userName = localStorage.getItem("lifeos-user-name") || "Adnan";
    const userEmail = localStorage.getItem("lifeos-user-email") || "adnan@lifeos.app";

    const handleThemeChange = (theme: "light" | "dark") => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        localStorage.setItem("lifeos-theme", theme);
        updateSettings.mutate({ theme });
        toast.success(`Theme changed to ${theme} mode`);
    };

    const handleCurrencyChange = (currency: string) => {
        updateSettings.mutate({ currency });
        toast.success(`Currency changed to ${currency}`);
    };

    const handleNotificationsChange = (enabled: boolean) => {
        updateSettings.mutate({ notifications_enabled: enabled });
        toast.success(`Notifications ${enabled ? "enabled" : "disabled"}`);
    };

    const handleBudgetSave = () => {
        const budget = parseFloat(monthlyBudget);
        if (!isNaN(budget) && budget >= 0) {
            updateSettings.mutate({ monthly_budget: budget });
            toast.success(`Monthly budget set to ৳${budget.toLocaleString()}`);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("lifeos-user-id");
        localStorage.removeItem("lifeos-user-name");
        localStorage.removeItem("lifeos-user-email");
        toast.success("Logged out successfully");
        window.location.href = "/";
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading settings...</div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <SEO title="Settings" description="Manage your preferences and profile." />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-8"
            >
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Settings className="w-8 h-8 text-primary" />
                        Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage your LifeOS preferences</p>
                </div>

                {/* Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6 space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Profile</h2>
                    </div>
                    <Separator />
                    <div className="grid gap-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={userName} disabled className="mt-1.5" />
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input value={userEmail} disabled className="mt-1.5" />
                        </div>
                    </div>
                </motion.div>

                {/* Appearance Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-6 space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Appearance</h2>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Theme</Label>
                            <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                        </div>
                        <Select
                            value={settings?.theme || "dark"}
                            onValueChange={(value) => handleThemeChange(value as "light" | "dark")}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="light">Light</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </motion.div>

                {/* Regional Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-6 space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Regional</h2>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Currency</Label>
                            <p className="text-sm text-muted-foreground">Set your local currency</p>
                        </div>
                        <Select
                            value={settings?.currency || "BDT"}
                            onValueChange={handleCurrencyChange}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BDT">৳ BDT</SelectItem>
                                <SelectItem value="USD">$ USD</SelectItem>
                                <SelectItem value="EUR">€ EUR</SelectItem>
                                <SelectItem value="INR">₹ INR</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </motion.div>

                {/* Budget Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-card p-6 space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Budget</h2>
                    </div>
                    <Separator />
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <Label>Monthly Budget</Label>
                            <Input
                                type="number"
                                placeholder={settings?.monthly_budget?.toString() || "0"}
                                value={monthlyBudget}
                                onChange={(e) => setMonthlyBudget(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <Button onClick={handleBudgetSave} className="gap-2">
                            <Save className="w-4 h-4" />
                            Save
                        </Button>
                    </div>
                    {settings?.monthly_budget ? (
                        <p className="text-sm text-muted-foreground">
                            Current budget: ৳{settings.monthly_budget.toLocaleString()}/month
                        </p>
                    ) : null}
                </motion.div>

                {/* Notifications Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card p-6 space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Notifications</h2>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Enable Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive reminders and updates</p>
                        </div>
                        <Switch
                            checked={settings?.notifications_enabled ?? true}
                            onCheckedChange={handleNotificationsChange}
                        />
                    </div>
                </motion.div>

                {/* Logout Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass-card p-6"
                >
                    <Button
                        variant="destructive"
                        onClick={handleLogout}
                        className="w-full gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </Button>
                </motion.div>
            </motion.div>
        </AppLayout>
    );
}

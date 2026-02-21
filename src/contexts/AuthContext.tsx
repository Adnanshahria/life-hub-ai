import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
// db import removed as we now interact via the backend API API_URL
const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000/api/auth";

// Types
export interface User {
    id: string;
    name: string;
    email: string;
}

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
    forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
    resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    googleLogin: (credential: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial check (simple local storage check for now since we don't have JWT implemented, 
    // ideally the backend would return a JWT and we'd verify it here)
    useEffect(() => {
        const storedUser = localStorage.getItem("lifeos-user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem("lifeos-user");
            }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (data.success) {
                setUser(data.user);
                localStorage.setItem("lifeos-user", JSON.stringify(data.user));
                return { success: true };
            }
            return { success: false, error: data.error, requiresVerification: data.requiresVerification };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error: "Network error. Make sure the backend is running." };
        }
    }, []);

    const register = useCallback(async (name: string, email: string, password: string) => {
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            return { success: !!data.success, error: data.error };
        } catch (error) {
            console.error("Registration failed:", error);
            return { success: false, error: "Network error." };
        }
    }, []);

    const verifyOtp = useCallback(async (email: string, otp: string) => {
        try {
            const res = await fetch(`${API_URL}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                localStorage.setItem("lifeos-user", JSON.stringify(data.user));
            }
            return { success: !!data.success, error: data.error };
        } catch (error) {
            return { success: false, error: "Network error." };
        }
    }, []);

    const forgotPassword = useCallback(async (email: string) => {
        try {
            const res = await fetch(`${API_URL}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            return { success: !!data.success, error: data.error };
        } catch (error) {
            return { success: false, error: "Network error." };
        }
    }, []);

    const resetPassword = useCallback(async (email: string, otp: string, newPassword: string) => {
        try {
            const res = await fetch(`${API_URL}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp, newPassword }),
            });
            const data = await res.json();
            return { success: !!data.success, error: data.error };
        } catch (error) {
            return { success: false, error: "Network error." };
        }
    }, []);

    const googleLogin = useCallback(async (credential: string) => {
        try {
            const res = await fetch(`${API_URL}/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential }),
            });
            const data = await res.json();

            if (data.success) {
                setUser(data.user);
                localStorage.setItem("lifeos-user", JSON.stringify(data.user));
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (error) {
            console.error("Google Login failed:", error);
            return { success: false, error: "Network error." };
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem("lifeos-user");
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                verifyOtp,
                forgotPassword,
                resetPassword,
                googleLogin,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

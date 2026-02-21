import express from "express";
import cors from "cors";
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path, { join } from "path";
import crypto from "crypto";
import { z } from "zod";
import { sendOtpEmail } from "./smtpService.js";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Only load .env locally. Vercel automatically injects environment variables.
if (process.env.NODE_ENV !== 'production') {
    try {
        dotenv.config({ path: join(process.cwd(), ".env") });
    } catch (e) {
        // Ignore errors in production
    }
}
const app = express();
app.use(cors());
app.use(express.json());

const db = createClient({
    url: process.env.VITE_TURSO_DB_URL || "",
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || "",
});

function generateId() {
    return crypto.randomUUID();
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "lifeos-salt-v1");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 1. Initial Registration (Creates unverified user + sends OTP)
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = z.object({
            name: z.string().min(1),
            email: z.string().email(),
            password: z.string().min(6),
        }).parse(req.body);

        const existing = await db.execute({
            sql: "SELECT id FROM users WHERE email = ?",
            args: [email],
        });

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const id = generateId();
        const passwordHash = await hashPassword(password);

        await db.execute({
            sql: "INSERT INTO users (id, name, email, password_hash, is_verified) VALUES (?, ?, ?, ?, 0)",
            args: [id, name, email, passwordHash],
        });

        await db.execute({
            sql: "INSERT INTO settings (id, user_id) VALUES (?, ?)",
            args: [generateId(), id],
        });

        // Generate & Send OTP
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins

        await db.execute({
            sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)",
            args: [generateId(), email, otp, "registration", expiresAt],
        });

        await sendOtpEmail(email, otp, "registration");

        res.json({ success: true, message: "Registration initiated. Check email for OTP." });
    } catch (error: any) {
        console.error("Register Error:", error);
        res.status(500).json({ error: "Registration failed." });
    }
});

// 2. Verify OTP for Registration
app.post("/api/auth/verify", async (req, res) => {
    try {
        const { email, otp } = req.body;
        const now = new Date().toISOString();

        const otpResult = await db.execute({
            sql: "SELECT id FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'registration' AND expires_at > ?",
            args: [email, otp, now],
        });

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        // Mark user as verified
        await db.execute({
            sql: "UPDATE users SET is_verified = 1 WHERE email = ?",
            args: [email],
        });

        // Delete used OTP
        await db.execute({ sql: "DELETE FROM otps WHERE id = ?", args: [otpResult.rows[0].id] });

        // Fetch user to return
        const userResult = await db.execute({
            sql: "SELECT id, name, email FROM users WHERE email = ?",
            args: [email],
        });

        res.json({ success: true, user: userResult.rows[0] });
    } catch (error: any) {
        console.error("Verify Error:", error);
        res.status(500).json({ error: "Verification failed." });
    }
});

// 3. Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const passwordHash = await hashPassword(password);

        const result = await db.execute({
            sql: "SELECT id, name, email, is_verified FROM users WHERE email = ? AND password_hash = ?",
            args: [email, passwordHash],
        });

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result.rows[0];

        if (!user.is_verified) {
            // Re-send OTP
            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
            await db.execute({
                sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)",
                args: [generateId(), email, otp, "registration", expiresAt],
            });
            await sendOtpEmail(email, otp, "registration");

            return res.status(403).json({ error: "Account not verified", requiresVerification: true });
        }

        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error: any) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// 4. Request Password Reset
app.post("/api/auth/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const userResult = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });

        if (userResult.rows.length > 0) {
            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
            await db.execute({
                sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)",
                args: [generateId(), email, otp, "password_reset", expiresAt],
            });
            await sendOtpEmail(email, otp, "password_reset");
        }

        // Always return success to prevent email enumeration
        res.json({ success: true, message: "If an account exists, a reset code was sent." });
    } catch (error) {
        console.error("Forgot PW Error:", error);
        res.status(500).json({ error: "Failed to process request" });
    }
});

// 5. Reset Password
app.post("/api/auth/reset-password", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });

        const now = new Date().toISOString();
        const otpResult = await db.execute({
            sql: "SELECT id FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'password_reset' AND expires_at > ?",
            args: [email, otp, now],
        });

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired reset code" });
        }

        const passwordHash = await hashPassword(newPassword);
        await db.execute({
            sql: "UPDATE users SET password_hash = ? WHERE email = ?",
            args: [passwordHash, email],
        });

        await db.execute({ sql: "DELETE FROM otps WHERE id = ?", args: [otpResult.rows[0].id] });

        res.json({ success: true, message: "Password reset securely." });
    } catch (error) {
        console.error("Reset PW Error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
});

// 6. Google OAuth Login/Register
import { OAuth2Client } from "google-auth-library";
const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

app.post("/api/auth/google", async (req, res) => {
    try {
        const { credential } = req.body;

        // Verify the Google JWT token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({ error: "Invalid Google token" });
        }

        const email = payload.email;
        const name = payload.name || "Google User";

        // Check if user exists
        const existing = await db.execute({
            sql: "SELECT id, name, email FROM users WHERE email = ?",
            args: [email],
        });

        if (existing.rows.length > 0) {
            // User exists, log them in (even if they originally registered with email/password)
            // Mark them as verified just in case they weren't
            await db.execute({
                sql: "UPDATE users SET is_verified = 1 WHERE email = ?",
                args: [email],
            });
            const user = existing.rows[0];
            return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
        } else {
            // User doesn't exist, create account automatically
            const id = generateId();
            // Create a random impossibly long password hash since they use Google
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const passwordHash = await hashPassword(randomPassword);

            await db.execute({
                sql: "INSERT INTO users (id, name, email, password_hash, is_verified) VALUES (?, ?, ?, ?, 1)",
                args: [id, name, email, passwordHash],
            });

            await db.execute({
                sql: "INSERT INTO settings (id, user_id) VALUES (?, ?)",
                args: [generateId(), id],
            });

            return res.json({ success: true, user: { id, name, email } });
        }
    } catch (error: any) {
        console.error("Google Auth Error:", error);
        res.status(500).json({ error: "Google Authentication failed" });
    }
});

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Export the Express API for Vercel Serverless Functions
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Vercel handles requests differently, so let express consume it
    return app(req as any, res as any);
}

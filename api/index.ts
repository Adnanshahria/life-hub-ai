import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@libsql/client";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";

// ─── Database ───
const db = createClient({
    url: process.env.VITE_TURSO_DB_URL || "",
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || "",
});

// ─── Helpers ───
const generateId = () => crypto.randomUUID();
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashPassword = (pw: string) => crypto.createHash("sha256").update(pw + "lifeos-salt-v1").digest("hex");

// ─── Google OAuth ───
const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// ─── Email ───
function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.VITE_SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.VITE_SMTP_PORT || "587"),
        secure: process.env.VITE_SMTP_SECURE === "true",
        auth: {
            user: process.env.VITE_SMTP_USER || "",
            pass: process.env.VITE_SMTP_PASS || "",
        },
    });
}

async function sendOtpEmail(to: string, otp: string, purpose: "registration" | "password_reset") {
    const subject = purpose === "registration"
        ? "Welcome to LifeHub AI - Verify Your Email"
        : "LifeHub AI - Password Reset Request";
    try {
        await getTransporter().sendMail({
            from: `"LifeHub AI" <${process.env.VITE_SMTP_USER || "noreply@lifehub.ai"}>`,
            to,
            subject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:10px">
                <h2 style="color:#0c4a6e">LifeHub AI</h2>
                <p>${purpose === "registration" ? "Thank you for registering!" : "Password reset request received."}</p>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:15px;border-radius:8px;text-align:center;margin:20px 0">
                    <p style="margin:0;font-size:14px;color:#166534">Your code is</p>
                    <h1 style="margin:10px 0 0;font-size:32px;letter-spacing:5px;color:#166534">${otp}</h1>
                </div>
                <p style="color:#64748b;font-size:12px">Expires in 10 minutes.</p>
            </div>`,
        });
    } catch (e) {
        console.error("Email send error:", e);
    }
}

// ─── CORS headers ───
function setCors(res: VercelResponse) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ─── Route handlers ───
async function handleRegister(body: any, res: VercelResponse) {
    const { name, email, password } = body;
    if (!name || !email || !password || password.length < 6) {
        return res.status(400).json({ error: "Name, email, and password (6+ chars) required" });
    }

    const existing = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
    if (existing.rows.length > 0) return res.status(400).json({ error: "Email already registered" });

    const id = generateId();
    const passwordHash = hashPassword(password);
    await db.execute({ sql: "INSERT INTO users (id, name, email, password_hash, is_verified) VALUES (?, ?, ?, ?, 0)", args: [id, name, email, passwordHash] });
    await db.execute({ sql: "INSERT INTO settings (id, user_id) VALUES (?, ?)", args: [generateId(), id] });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    await db.execute({ sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)", args: [generateId(), email, otp, "registration", expiresAt] });
    await sendOtpEmail(email, otp, "registration");

    return res.json({ success: true, message: "Registration initiated. Check email for OTP." });
}

async function handleVerify(body: any, res: VercelResponse) {
    const { email, otp } = body;
    const now = new Date().toISOString();
    const result = await db.execute({ sql: "SELECT id FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'registration' AND expires_at > ?", args: [email, otp, now] });
    if (result.rows.length === 0) return res.status(400).json({ error: "Invalid or expired OTP" });

    await db.execute({ sql: "UPDATE users SET is_verified = 1 WHERE email = ?", args: [email] });
    await db.execute({ sql: "DELETE FROM otps WHERE id = ?", args: [result.rows[0].id] });
    const user = await db.execute({ sql: "SELECT id, name, email FROM users WHERE email = ?", args: [email] });

    return res.json({ success: true, user: user.rows[0] });
}

async function handleLogin(body: any, res: VercelResponse) {
    const { email, password } = body;
    const passwordHash = hashPassword(password);
    const result = await db.execute({ sql: "SELECT id, name, email, is_verified FROM users WHERE email = ? AND password_hash = ?", args: [email, passwordHash] });

    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });

    const user = result.rows[0];
    if (!user.is_verified) {
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
        await db.execute({ sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)", args: [generateId(), email, otp, "registration", expiresAt] });
        await sendOtpEmail(email, otp, "registration");
        return res.status(403).json({ error: "Account not verified", requiresVerification: true });
    }

    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
}

async function handleForgotPassword(body: any, res: VercelResponse) {
    const { email } = body;
    const user = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
    if (user.rows.length > 0) {
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
        await db.execute({ sql: "INSERT INTO otps (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)", args: [generateId(), email, otp, "password_reset", expiresAt] });
        await sendOtpEmail(email, otp, "password_reset");
    }
    return res.json({ success: true, message: "If an account exists, a reset code was sent." });
}

async function handleResetPassword(body: any, res: VercelResponse) {
    const { email, otp, newPassword } = body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password too short" });

    const now = new Date().toISOString();
    const result = await db.execute({ sql: "SELECT id FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'password_reset' AND expires_at > ?", args: [email, otp, now] });
    if (result.rows.length === 0) return res.status(400).json({ error: "Invalid or expired reset code" });

    await db.execute({ sql: "UPDATE users SET password_hash = ? WHERE email = ?", args: [hashPassword(newPassword), email] });
    await db.execute({ sql: "DELETE FROM otps WHERE id = ?", args: [result.rows[0].id] });

    return res.json({ success: true, message: "Password reset securely." });
}

async function handleGoogleAuth(body: any, res: VercelResponse) {
    const { credential } = body;
    if (!credential) return res.status(400).json({ error: "No credential provided" });

    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: "Invalid Google token" });

    const email = payload.email;
    const name = payload.name || "Google User";

    const existing = await db.execute({ sql: "SELECT id, name, email FROM users WHERE email = ?", args: [email] });

    if (existing.rows.length > 0) {
        await db.execute({ sql: "UPDATE users SET is_verified = 1 WHERE email = ?", args: [email] });
        const user = existing.rows[0];
        return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    }

    const id = generateId();
    const passwordHash = hashPassword(crypto.randomBytes(32).toString("hex"));
    await db.execute({ sql: "INSERT INTO users (id, name, email, password_hash, is_verified) VALUES (?, ?, ?, ?, 1)", args: [id, name, email, passwordHash] });
    await db.execute({ sql: "INSERT INTO settings (id, user_id) VALUES (?, ?)", args: [generateId(), id] });

    return res.json({ success: true, user: { id, name, email } });
}

// ─── Main Vercel Handler (no Express!) ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res);

    // Handle preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Parse the route from the URL
    const url = req.url || "";
    const route = url.split("?")[0]; // Remove query params

    try {
        // Health check
        if (route === "/api/health") {
            return res.json({ status: "ok", time: new Date().toISOString(), env: !!process.env.VITE_GOOGLE_CLIENT_ID ? "configured" : "missing" });
        }

        // All auth routes require POST
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const body = req.body || {};

        if (route === "/api/auth/register") return await handleRegister(body, res);
        if (route === "/api/auth/verify") return await handleVerify(body, res);
        if (route === "/api/auth/login") return await handleLogin(body, res);
        if (route === "/api/auth/forgot-password") return await handleForgotPassword(body, res);
        if (route === "/api/auth/reset-password") return await handleResetPassword(body, res);
        if (route === "/api/auth/google") return await handleGoogleAuth(body, res);

        return res.status(404).json({ error: "Route not found", route });
    } catch (error: any) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}

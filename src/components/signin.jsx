import { useState } from "react";
import { signin } from "../api/auth";

export default function Signin() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [msg, setMsg] = useState("");

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await signin(form);
            if (res?.access_token) {
                setMsg("✅ Sign in successful. Session token stored.");
                return;
            }

            setMsg("❌ Sign in failed. No access token returned.");
        } catch (error) {
            const status = error?.status;
            const detail = (error?.message || "").toLowerCase();
            const userMissing =
                status === 404 ||
                detail.includes("not found") ||
                detail.includes("does not exist") ||
                detail.includes("user not found");

            setMsg(
                userMissing
                    ? "⚠️ User does not exist. Please sign up first."
                    : `❌ ${error?.userMessage || "Could not sign in right now. Please try again."}`
            );
        }
    };

    return (
        <div className="auth-card">
            <div className="card-heading">
                <h2>Welcome back</h2>
                <p>Sign in to continue to your workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
                <label className="field">
                    <span>Email</span>
                    <input name="email" type="email" placeholder="you@company.com" onChange={handleChange} required />
                </label>

                <label className="field">
                    <span>Password</span>
                    <input name="password" type="password" placeholder="Your password" onChange={handleChange} required />
                </label>

                <button className="primary-button" type="submit">Sign In</button>
            </form>

            {msg && (
                <p className={`status-message ${msg.startsWith("✅") ? "success" : "error"}`}>
                    {msg}
                </p>
            )}
        </div>
    );
}
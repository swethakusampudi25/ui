import { useState } from "react";
import { signup } from "../api/auth";

export default function Signup({ onSignupSuccess }) {
    const [form, setForm] = useState({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        permanent_address: "",
    });

    const [msg, setMsg] = useState("");

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await signup(form);
            setMsg("✅ Signup successful. Please sign in to continue.");
            onSignupSuccess?.();
        } catch (error) {
            setMsg(`❌ ${error?.userMessage || "Could not create account right now. Please try again."}`);
        }
    };

    return (
        <div className="auth-card">
            <div className="card-heading">
                <h2>Create your profile</h2>
                <p>Join the platform with your official details.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="field-grid">
                    <label className="field">
                        <span>First Name</span>
                        <input name="first_name" placeholder="Ada" onChange={handleChange} required />
                    </label>
                    <label className="field">
                        <span>Last Name</span>
                        <input name="last_name" placeholder="Lovelace" onChange={handleChange} required />
                    </label>
                </div>

                <label className="field">
                    <span>Email</span>
                    <input name="email" type="email" placeholder="you@company.com" onChange={handleChange} required />
                </label>

                <label className="field">
                    <span>Password</span>
                    <input name="password" type="password" placeholder="Create a strong password" onChange={handleChange} required />
                </label>

                <label className="field">
                    <span>Permanent Address</span>
                    <input
                        name="permanent_address"
                        placeholder="Enter your permanent address"
                        onChange={handleChange}
                        required
                    />
                </label>

                <button className="primary-button" type="submit">Create Account</button>
            </form>

            {msg && <p className={`status-message ${msg.startsWith("✅") ? "success" : "error"}`}>{msg}</p>}
        </div>
    );
}
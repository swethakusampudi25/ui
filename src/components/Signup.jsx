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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = {};
        if (!form.email.includes("@")) nextErrors.email = "Enter a valid email address.";
        if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
        if (!form.first_name.trim()) nextErrors.first_name = "First name is required.";
        if (!form.last_name.trim()) nextErrors.last_name = "Last name is required.";
        if (!form.permanent_address.trim()) nextErrors.permanent_address = "Permanent address is required.";
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            await signup(form);
            setMsg("✅ Signup successful. Please sign in to continue.");
            onSignupSuccess?.();
        } catch (error) {
            setMsg(`❌ ${error?.userMessage || "Could not create account right now. Please try again."}`);
        } finally {
            setIsSubmitting(false);
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
                        {fieldErrors.first_name && <small className="field-error">{fieldErrors.first_name}</small>}
                    </label>
                    <label className="field">
                        <span>Last Name</span>
                        <input name="last_name" placeholder="Lovelace" onChange={handleChange} required />
                        {fieldErrors.last_name && <small className="field-error">{fieldErrors.last_name}</small>}
                    </label>
                </div>

                <label className="field">
                    <span>Email</span>
                    <input name="email" type="email" placeholder="you@company.com" onChange={handleChange} required />
                    {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
                </label>

                <label className="field">
                    <span>Password</span>
                    <input name="password" type="password" placeholder="Create a strong password" onChange={handleChange} required />
                    {fieldErrors.password && <small className="field-error">{fieldErrors.password}</small>}
                </label>

                <label className="field">
                    <span>Permanent Address</span>
                    <input
                        name="permanent_address"
                        placeholder="Enter your permanent address"
                        onChange={handleChange}
                        required
                    />
                    {fieldErrors.permanent_address && <small className="field-error">{fieldErrors.permanent_address}</small>}
                </label>

                <button className="primary-button" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating account..." : "Create Account"}
                </button>
            </form>

            {msg && <p className={`status-message ${msg.startsWith("✅") ? "success" : "error"}`}>{msg}</p>}
        </div>
    );
}
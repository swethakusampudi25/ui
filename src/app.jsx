import Signup from "./components/Signup";
import { useMemo, useState } from "react";
import Signin from "./components/signin";

export default function App() {
    const [activeView, setActiveView] = useState("signup");
    const currentYear = useMemo(() => new Date().getFullYear(), []);

    return (
        <div className="app-shell">
            <div className="ambient-glow glow-one" />
            <div className="ambient-glow glow-two" />

            <header className="hero">
                <p className="eyebrow">EARLY ECO ACCESS</p>
                <h1>Future-Ready Auth Portal</h1>
                <p className="hero-subtitle">
                    Fast onboarding with a sleek, responsive interface designed for modern users.
                </p>
            </header>

            <section className="panel">
                <div className="tab-row">
                    <button
                        className={`tab-button ${activeView === "signup" ? "active" : ""}`}
                        onClick={() => setActiveView("signup")}
                        type="button"
                    >
                        Create Account
                    </button>
                    <button
                        className={`tab-button ${activeView === "signin" ? "active" : ""}`}
                        onClick={() => setActiveView("signin")}
                        type="button"
                    >
                        Sign In
                    </button>
                </div>

                <div className="form-area">
                    {activeView === "signup" ? <Signup /> : <Signin />}
                </div>
            </section>

            <footer className="app-footer">Secure by design - {currentYear}</footer>
        </div>
    );
}
import Signup from "./components/Signup";
import { useEffect, useMemo, useState } from "react";
import { getSessionToken } from "./api/auth";
import {
    fetchHealthCheckinById,
    fetchHealthCheckinList,
    fetchHealthTrend,
    fetchLatestHealthCheckin,
    submitHealthCheckin,
} from "./api/healthCheckins";
import HealthCheckinModal from "./components/HealthCheckinModal";
import Signin from "./components/signin";

export default function App() {
    const [activeView, setActiveView] = useState("signup");
    const [isSignedIn, setIsSignedIn] = useState(Boolean(getSessionToken()));
    const [hasLoggedInThisVisit, setHasLoggedInThisVisit] = useState(false);
    const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
    const [healthInfo, setHealthInfo] = useState(null);
    const [healthTrend, setHealthTrend] = useState(null);
    const [healthHistory, setHealthHistory] = useState([]);
    const [healthSubmitMessage, setHealthSubmitMessage] = useState("");
    const [isSubmittingHealth, setIsSubmittingHealth] = useState(false);
    const [isHealthLoading, setIsHealthLoading] = useState(false);
    const [sinceFilter, setSinceFilter] = useState("");
    const [untilFilter, setUntilFilter] = useState("");
    const [selectedCheckin, setSelectedCheckin] = useState(null);
    const [isCheckinLoading, setIsCheckinLoading] = useState(false);
    const currentYear = useMemo(() => new Date().getFullYear(), []);
    const normalizeTimestamp = (value) => {
        if (typeof value !== "string") return value;
        return value.replace(/\.(\d{3})\d+Z$/, ".$1Z");
    };
    const formatDateTime = (value) => {
        const parsed = new Date(normalizeTimestamp(value));
        return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString();
    };
    const riskChartData = useMemo(() => {
        const normalized = [...healthHistory]
            .filter((entry) => entry?.recorded_at && typeof entry?.risk_score === "number")
            .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
        if (!normalized.length) return { linePoints: "", points: [] };

        const maxRisk = Math.max(...normalized.map((item) => item.risk_score), 1);
        const maxX = normalized.length - 1 || 1;
        const points = normalized.map((item, idx) => {
            const x = (idx / maxX) * 100;
            const y = 100 - (item.risk_score / maxRisk) * 100;
            return { id: item.id, x, y, risk: item.risk_score, recordedAt: item.recorded_at };
        });
        return { linePoints: points.map((point) => `${point.x},${point.y}`).join(" "), points };
    }, [healthHistory]);
    const filterSummary = useMemo(() => {
        if (!sinceFilter && !untilFilter) return "Showing latest records";
        const parts = [];
        if (sinceFilter) parts.push(`from ${new Date(sinceFilter).toLocaleDateString()}`);
        if (untilFilter) parts.push(`to ${new Date(untilFilter).toLocaleDateString()}`);
        return `Filtered ${parts.join(" ")}`;
    }, [sinceFilter, untilFilter]);

    const loadHealthDashboard = async () => {
        if (!getSessionToken()) return;
        setIsHealthLoading(true);
        try {
            const sinceIso = sinceFilter ? new Date(`${sinceFilter}T00:00:00`).toISOString() : undefined;
            const untilIso = untilFilter ? new Date(`${untilFilter}T23:59:59`).toISOString() : undefined;
            const [latest, trend, history] = await Promise.all([
                fetchLatestHealthCheckin(),
                fetchHealthTrend(30),
                fetchHealthCheckinList({ limit: 30, since: sinceIso, until: untilIso }),
            ]);
            setHealthInfo({
                ...latest,
                recorded_at: normalizeTimestamp(latest?.recorded_at),
                assessed_at: normalizeTimestamp(latest?.assessed_at),
            });
            setHealthTrend(trend);
            setHealthHistory(
                Array.isArray(history)
                    ? history.map((entry) => ({
                        ...entry,
                        recorded_at: normalizeTimestamp(entry?.recorded_at),
                        assessed_at: normalizeTimestamp(entry?.assessed_at),
                    }))
                    : []
            );
        } catch (error) {
            setHealthSubmitMessage(`❌ ${error?.userMessage || "Unable to load health information right now."}`);
        } finally {
            setIsHealthLoading(false);
        }
    };

    useEffect(() => {
        if (isSignedIn) {
            loadHealthDashboard();
        }
    }, [isSignedIn]);

    const handleSigninSuccess = () => {
        setIsSignedIn(true);
        setHasLoggedInThisVisit(true);
        setHealthSubmitMessage("");
        setIsHealthModalOpen(true);
    };

    const handleHealthSubmit = async (payload) => {
        setIsSubmittingHealth(true);
        setHealthSubmitMessage("");
        try {
            const result = await submitHealthCheckin(payload);
            setHealthInfo({
                ...result,
                recorded_at: normalizeTimestamp(result?.recorded_at),
                assessed_at: normalizeTimestamp(result?.assessed_at),
            });
            setHealthSubmitMessage("✅ Health details saved successfully.");
            setIsHealthModalOpen(false);
            await loadHealthDashboard();
        } catch (error) {
            setHealthSubmitMessage(`❌ ${error?.userMessage || "Unable to save health details right now."}`);
            return;
        } finally {
            setIsSubmittingHealth(false);
        }
    };

    const handleSelectCheckin = async (checkinId) => {
        if (!checkinId) return;
        setIsCheckinLoading(true);
        try {
            const checkin = await fetchHealthCheckinById(checkinId);
            setSelectedCheckin({
                ...checkin,
                recorded_at: normalizeTimestamp(checkin?.recorded_at),
                assessed_at: normalizeTimestamp(checkin?.assessed_at),
            });
        } catch (error) {
            setHealthSubmitMessage(`❌ ${error?.userMessage || "Unable to load selected check-in."}`);
        } finally {
            setIsCheckinLoading(false);
        }
    };

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
                    {activeView === "signup" ? (
                        <Signup onSignupSuccess={() => setActiveView("signin")} />
                    ) : (
                        <Signin onSigninSuccess={handleSigninSuccess} />
                    )}
                </div>
            </section>

            {isSignedIn && hasLoggedInThisVisit && (
                <section className="panel health-panel">
                    <div className="card-heading">
                        <h2>Your Health Information</h2>
                        <p>Submit and review your latest health check-in details.</p>
                    </div>
                    <button className="primary-button" type="button" onClick={() => setIsHealthModalOpen(true)}>
                        Add / Update Health Check-In
                    </button>
                    <button className="ghost-button" type="button" onClick={loadHealthDashboard}>
                        Refresh Data
                    </button>
                    <div className="filter-grid">
                        <label className="field">
                            <span>Since</span>
                            <input type="date" value={sinceFilter} onChange={(e) => setSinceFilter(e.target.value)} />
                        </label>
                        <label className="field">
                            <span>Until</span>
                            <input type="date" value={untilFilter} onChange={(e) => setUntilFilter(e.target.value)} />
                        </label>
                        <button className="ghost-button" type="button" onClick={loadHealthDashboard}>
                            Apply Filters
                        </button>
                    </div>
                    <p className="filter-summary">{filterSummary}</p>

                    {healthSubmitMessage && (
                        <p className={`status-message ${healthSubmitMessage.startsWith("✅") ? "success" : "error"}`}>
                            {healthSubmitMessage}
                        </p>
                    )}

                    {isHealthLoading && <p className="status-message">Loading health insights...</p>}

                    {healthTrend && (
                        <div className="insight-grid">
                            <div className="insight-card">
                                <span>Risk Level</span>
                                <strong>{healthTrend.latest_is_healthy ? "Healthy" : healthInfo?.risk_level || "At risk"}</strong>
                            </div>
                            <div className="insight-card">
                                <span>Latest Risk Score</span>
                                <strong>{healthTrend.latest_risk_score ?? "-"}</strong>
                            </div>
                            <div className="insight-card">
                                <span>Trend Direction</span>
                                <strong>{healthTrend.trend_direction || "-"}</strong>
                            </div>
                            <div className="insight-card">
                                <span>Healthy Check-ins</span>
                                <strong>{healthTrend.healthy_points ?? 0} / {healthTrend.total_points ?? 0}</strong>
                            </div>
                        </div>
                    )}

                    {riskChartData.linePoints && (
                        <div className="chart-wrap">
                            <h3>Risk Trend</h3>
                            <svg viewBox="0 0 100 100" className="risk-chart" preserveAspectRatio="none">
                                <polyline points={riskChartData.linePoints} fill="none" stroke="#56d6ff" strokeWidth="2.2" />
                                {riskChartData.points.map((point) => (
                                    <circle
                                        key={point.id}
                                        cx={point.x}
                                        cy={point.y}
                                        r="2.2"
                                        className="risk-point"
                                        onClick={() => handleSelectCheckin(point.id)}
                                    >
                                        <title>{`${formatDateTime(point.recordedAt)} | Risk ${point.risk}`}</title>
                                    </circle>
                                ))}
                            </svg>
                            <p className="chart-caption">Click a point to view full check-in details.</p>
                        </div>
                    )}

                    {healthInfo && (
                        <div className="health-summary">
                            <h3>Latest Assessment</h3>
                            <p>{healthInfo.assessment_summary || "Assessment summary not available yet."}</p>
                            <div className="field-grid">
                                <div className="insight-card">
                                    <span>Vitals</span>
                                    <strong>
                                        HR {healthInfo.vitals?.heart_rate_bpm} | SpO2 {healthInfo.vitals?.spo2_percent}%
                                    </strong>
                                </div>
                                <div className="insight-card">
                                    <span>Body Temperature</span>
                                    <strong>{healthInfo.body_temperature_c} C</strong>
                                </div>
                                <div className="insight-card">
                                    <span>Feeling Score</span>
                                    <strong>{healthInfo.feeling_score}/10</strong>
                                </div>
                                <div className="insight-card">
                                    <span>Location</span>
                                    <strong>{[healthInfo.city, healthInfo.region, healthInfo.country].filter(Boolean).join(", ")}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {healthHistory.length > 0 && (
                        <div className="history-table-wrap">
                            <h3>Recent Check-ins</h3>
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Recorded</th>
                                        <th>Risk</th>
                                        <th>Status</th>
                                        <th>Temp (C)</th>
                                        <th>City</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {healthHistory.map((entry) => (
                                        <tr key={entry.id}>
                                            <td>{entry.recorded_at ? formatDateTime(entry.recorded_at) : "-"}</td>
                                            <td>
                                                <button
                                                    className="link-button"
                                                    type="button"
                                                    onClick={() => handleSelectCheckin(entry.id)}
                                                >
                                                    {entry.risk_score ?? "-"}
                                                </button>
                                            </td>
                                            <td>{entry.risk_level || (entry.is_healthy ? "healthy" : "at risk")}</td>
                                            <td>{entry.body_temperature_c ?? "-"}</td>
                                            <td>{entry.city || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(selectedCheckin || isCheckinLoading) && (
                        <div className="selected-checkin-wrap">
                            <h3>Selected Check-in Detail</h3>
                            {isCheckinLoading ? (
                                <p className="status-message">Loading selected check-in...</p>
                            ) : (
                                <pre className="health-json-view">{JSON.stringify(selectedCheckin, null, 2)}</pre>
                            )}
                        </div>
                    )}
                </section>
            )}

            <HealthCheckinModal
                open={isHealthModalOpen}
                onClose={() => setIsHealthModalOpen(false)}
                onSubmit={handleHealthSubmit}
                submitting={isSubmittingHealth}
            />

            <footer className="app-footer">Secure by design - {currentYear}</footer>
        </div>
    );
}
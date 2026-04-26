import Signup from "./components/Signup";
import { useEffect, useMemo, useState } from "react";
import { clearSessionToken, fetchMe, getSessionToken, logout } from "./api/auth";
import {
    fetchHealthCheckinById,
    fetchHealthCheckinList,
    fetchHealthSuggestions,
    fetchHealthTrend,
    fetchLatestHealthCheckin,
    submitHealthCheckin,
} from "./api/healthCheckins";
import HealthCheckinModal from "./components/HealthCheckinModal";
import Signin from "./components/signin";

export default function App() {
    const [activeView, setActiveView] = useState("signup");
    const [isSignedIn, setIsSignedIn] = useState(Boolean(getSessionToken()));
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
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(5);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [healthSuggestions, setHealthSuggestions] = useState(null);
    const [suggestionsError, setSuggestionsError] = useState("");
    const [toasts, setToasts] = useState([]);
    const [hoveredRiskPoint, setHoveredRiskPoint] = useState(null);
    const [apiCallStats, setApiCallStats] = useState({
        latest: 0,
        trend: 0,
        list: 0,
        detail: 0,
    });
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
        if (!normalized.length) return { bars: [] };

        const maxRisk = Math.max(...normalized.map((item) => item.risk_score), 1);
        const maxX = normalized.length - 1;
        const bars = normalized.map((item, idx) => {
            const normalizedRisk = item.risk_score / maxRisk;
            let tone = "safe";
            if (normalizedRisk >= 0.75) tone = "critical";
            else if (normalizedRisk >= 0.5) tone = "warning";
            return {
                id: item.id,
                risk: item.risk_score,
                recordedAt: item.recorded_at,
                height: Math.max(8, normalizedRisk * 100),
                xPercent: maxX > 0 ? (idx / maxX) * 100 : 50,
                tone,
            };
        });

        return { bars };
    }, [healthHistory]);
    const riskLevelBars = useMemo(() => {
        const levels = { low: 0, medium: 0, high: 0, unknown: 0 };
        healthHistory.forEach((entry) => {
            const key = (entry?.risk_level || "").toLowerCase();
            if (key.includes("low")) levels.low += 1;
            else if (key.includes("medium")) levels.medium += 1;
            else if (key.includes("high")) levels.high += 1;
            else levels.unknown += 1;
        });
        const max = Math.max(levels.low, levels.medium, levels.high, levels.unknown, 1);
        return [
            { label: "Low", value: levels.low, height: (levels.low / max) * 100, tone: "low" },
            { label: "Medium", value: levels.medium, height: (levels.medium / max) * 100, tone: "medium" },
            { label: "High", value: levels.high, height: (levels.high / max) * 100, tone: "high" },
            { label: "Unknown", value: levels.unknown, height: (levels.unknown / max) * 100, tone: "unknown" },
        ];
    }, [healthHistory]);
    const totalGetCalls = useMemo(
        () => apiCallStats.latest + apiCallStats.trend + apiCallStats.list + apiCallStats.detail,
        [apiCallStats]
    );
    const totalHistoryPages = Math.max(1, Math.ceil(healthHistory.length / historyPageSize));
    const paginatedHistory = useMemo(() => {
        const start = (historyPage - 1) * historyPageSize;
        return healthHistory.slice(start, start + historyPageSize);
    }, [healthHistory, historyPage, historyPageSize]);
    const filterSummary = useMemo(() => {
        if (!sinceFilter && !untilFilter) return "Showing latest records";
        const parts = [];
        if (sinceFilter) parts.push(`from ${new Date(sinceFilter).toLocaleDateString()}`);
        if (untilFilter) parts.push(`to ${new Date(untilFilter).toLocaleDateString()}`);
        return `Filtered ${parts.join(" ")}`;
    }, [sinceFilter, untilFilter]);
    const pushToast = (variant, message) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts((prev) => [...prev, { id, variant, message }]);
    };
    const toneClassForRisk = (riskLevel) => {
        const level = (riskLevel || "").toLowerCase();
        if (level.includes("high")) return "tone-critical";
        if (level.includes("medium")) return "tone-warning";
        if (level.includes("low")) return "tone-good";
        return "tone-neutral";
    };
    const toneClassForSeverity = (severity) => {
        const value = (severity || "").toLowerCase();
        if (value.includes("critical")) return "tone-critical";
        if (value.includes("warn")) return "tone-warning";
        if (value.includes("info")) return "tone-info";
        return "tone-neutral";
    };
    const toneClassForSuggestionCategory = (category) => {
        const value = (category || "").toLowerCase();
        if (value.includes("respiratory")) return "tone-info";
        if (value.includes("fever")) return "tone-warning";
        if (value.includes("tracking")) return "tone-neutral";
        if (value.includes("maintenance")) return "tone-good";
        return "tone-neutral";
    };
    const toneClassForRiskScore = (score) => {
        if (typeof score !== "number") return "tone-neutral";
        if (score >= 66) return "tone-critical";
        if (score >= 33) return "tone-warning";
        return "tone-good";
    };
    const toneClassForTrendDirection = (direction) => {
        const value = (direction || "").toLowerCase();
        if (value.includes("wors")) return "tone-critical";
        if (value.includes("improv")) return "tone-good";
        if (value.includes("stable")) return "tone-info";
        return "tone-neutral";
    };
    const toneClassForHealthyRatio = (healthyPoints, totalPoints) => {
        if (typeof healthyPoints !== "number" || typeof totalPoints !== "number" || totalPoints <= 0) {
            return "tone-neutral";
        }
        const ratio = healthyPoints / totalPoints;
        if (ratio >= 0.8) return "tone-good";
        if (ratio >= 0.5) return "tone-warning";
        return "tone-critical";
    };
    const toneClassForApiCalls = (count, warningThreshold = 4, criticalThreshold = 8) => {
        if (typeof count !== "number") return "tone-neutral";
        if (count >= criticalThreshold) return "tone-critical";
        if (count >= warningThreshold) return "tone-warning";
        return "tone-good";
    };

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
            setApiCallStats((prev) => ({
                ...prev,
                latest: prev.latest + 1,
                trend: prev.trend + 1,
                list: prev.list + 1,
            }));
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
            setHistoryPage(1);
        } catch (error) {
            if (error?.status === 401) {
                clearSessionToken();
                setIsSignedIn(false);
                setHealthSubmitMessage("⚠️ Session expired. Please sign in again.");
                return;
            }
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

    useEffect(() => {
        if (!toasts.length) return undefined;
        const timer = setTimeout(() => {
            setToasts((prev) => prev.slice(1));
        }, 2800);
        return () => clearTimeout(timer);
    }, [toasts]);

    const handleSigninSuccess = () => {
        setIsSignedIn(true);
        setHealthSubmitMessage("");
        setIsHealthModalOpen(true);
        pushToast("success", "Welcome back. You are signed in.");
    };

    const handleLogout = async () => {
        await logout();
        setIsSignedIn(false);
        setHealthInfo(null);
        setHealthTrend(null);
        setHealthHistory([]);
        setSelectedCheckin(null);
        setHealthSubmitMessage("✅ Logged out successfully.");
        setActiveView("signin");
        setIsProfileOpen(false);
        pushToast("success", "Logged out successfully.");
    };

    const handleOpenProfile = async () => {
        setIsProfileOpen(true);
        setIsProfileLoading(true);
        setProfileError("");
        try {
            const me = await fetchMe();
            setProfileData(me);
        } catch (error) {
            setProfileData(null);
            setProfileError(error?.userMessage || "Unable to load profile details.");
            setHealthSubmitMessage(`❌ ${error?.userMessage || "Unable to load profile."}`);
            pushToast("error", error?.userMessage || "Unable to load profile.");
        } finally {
            setIsProfileLoading(false);
        }
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
            pushToast("success", "Health check-in saved.");
        } catch (error) {
            setHealthSubmitMessage(`❌ ${error?.userMessage || "Unable to save health details right now."}`);
            pushToast("error", error?.userMessage || "Unable to save health details.");
            return;
        } finally {
            setIsSubmittingHealth(false);
        }
    };

    const handleOpenSuggestions = async () => {
        setIsSuggestionsOpen(true);
        setIsSuggestionsLoading(true);
        setSuggestionsError("");
        try {
            const data = await fetchHealthSuggestions(48);
            setHealthSuggestions(data);
        } catch (error) {
            setHealthSuggestions(null);
            setSuggestionsError(error?.userMessage || "Unable to load health suggestions.");
            pushToast("error", error?.userMessage || "Unable to load health suggestions.");
        } finally {
            setIsSuggestionsLoading(false);
        }
    };

    const handleSelectCheckin = async (checkinId) => {
        if (!checkinId) return;
        setIsCheckinLoading(true);
        try {
            const checkin = await fetchHealthCheckinById(checkinId);
            setApiCallStats((prev) => ({ ...prev, detail: prev.detail + 1 }));
            setSelectedCheckin({
                ...checkin,
                recorded_at: normalizeTimestamp(checkin?.recorded_at),
                assessed_at: normalizeTimestamp(checkin?.assessed_at),
            });
        } catch (error) {
            setHealthSubmitMessage(`❌ ${error?.userMessage || "Unable to load selected check-in."}`);
            pushToast("error", error?.userMessage || "Unable to load selected check-in.");
        } finally {
            setIsCheckinLoading(false);
        }
    };

    return (
        <div className="app-shell">
            <div className="ambient-glow glow-one" />
            <div className="ambient-glow glow-two" />

            {isSignedIn && (
                <div className="page-top-actions">
                    <button
                        className="ghost-button icon-button"
                        type="button"
                        onClick={handleOpenProfile}
                        aria-label="Open profile"
                        title="Profile"
                    >
                        <svg viewBox="0 0 24 24" className="icon-svg" aria-hidden="true">
                            <path
                                d="M12 12a4.75 4.75 0 1 0-4.75-4.75A4.75 4.75 0 0 0 12 12Zm0 2.5c-4.25 0-7.75 2.43-7.75 5.42A1.08 1.08 0 0 0 5.33 21h13.34a1.08 1.08 0 0 0 1.08-1.08c0-2.99-3.5-5.42-7.75-5.42Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>
            )}

            {!isSignedIn && (
                <div className="modal-overlay auth-modal-overlay" role="dialog" aria-modal="true" aria-label="Authentication">
                    <div className="modal-card auth-modal-card">
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
                    </div>
                </div>
            )}

            {isSignedIn && (
                <section className="panel health-panel">
                    <h1 className="main-page-title">EarlyEco Health Dashboard</h1>
                    <div className="dashboard-top">
                        <div className="dashboard-top-left">
                            <div className="card-heading">
                                <h2>Your Health Information</h2>
                                <p>Submit and review your latest health check-in details.</p>
                            </div>
                        </div>
                        <div className="dashboard-top-right">
                            <button className="primary-button control-btn" type="button" onClick={() => setIsHealthModalOpen(true)}>
                                Feed your health info
                            </button>
                            <div className="mini-filter-strip">
                                <label className="field mini-field">
                                    <span>Start Date</span>
                                    <input type="date" value={sinceFilter} onChange={(e) => setSinceFilter(e.target.value)} />
                                </label>
                                <label className="field mini-field">
                                    <span>End Date</span>
                                    <input type="date" value={untilFilter} onChange={(e) => setUntilFilter(e.target.value)} />
                                </label>
                                <button className="ghost-button control-btn" type="button" onClick={loadHealthDashboard}>
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="insight-grid kpi-top-grid">
                        <div className={`insight-card ${toneClassForRisk(healthInfo?.risk_level)}`}>
                            <span>Risk Level</span>
                            <strong>{healthTrend?.latest_is_healthy ? "Healthy" : healthInfo?.risk_level || "-"}</strong>
                        </div>
                        <div className={`insight-card ${toneClassForRiskScore(healthTrend?.latest_risk_score)}`}>
                            <span>Latest Risk Score</span>
                            <strong>{healthTrend?.latest_risk_score ?? "-"}</strong>
                        </div>
                        <div className={`insight-card ${toneClassForTrendDirection(healthTrend?.trend_direction)}`}>
                            <span>Trend Direction</span>
                            <strong>{healthTrend?.trend_direction || "-"}</strong>
                        </div>
                        <div
                            className={`insight-card ${toneClassForHealthyRatio(
                                healthTrend?.healthy_points,
                                healthTrend?.total_points
                            )}`}
                        >
                            <span>Healthy Check-ins</span>
                            <strong>{healthTrend?.healthy_points ?? 0} / {healthTrend?.total_points ?? 0}</strong>
                        </div>
                    </div>
                    <div className="dashboard-scroll">
                        <p className="filter-summary">{filterSummary}</p>

                        {healthSubmitMessage && (
                            <p className={`status-message ${healthSubmitMessage.startsWith("✅") ? "success" : "error"}`}>
                                {healthSubmitMessage}
                            </p>
                        )}

                        {isHealthLoading && (
                            <div className="loading-skeleton-wrap">
                                <div className="skeleton-line" />
                                <div className="skeleton-grid">
                                    <div className="skeleton-card" />
                                    <div className="skeleton-card" />
                                    <div className="skeleton-card" />
                                </div>
                            </div>
                        )}

                        {riskChartData.bars.length > 0 && (
                            <div className="chart-wrap">
                                <h3>Risk Trend</h3>
                                <div className="risk-chart-wrap" onMouseLeave={() => setHoveredRiskPoint(null)}>
                                    <div className="risk-bar-chart">
                                        {riskChartData.bars.map((bar) => (
                                            <button
                                                key={bar.id}
                                                type="button"
                                                className={`risk-trend-bar ${bar.tone}`}
                                                style={{ height: `${bar.height}%` }}
                                                onMouseEnter={() => setHoveredRiskPoint(bar)}
                                                onFocus={() => setHoveredRiskPoint(bar)}
                                                onClick={() => handleSelectCheckin(bar.id)}
                                                aria-label={`Risk ${bar.risk} at ${formatDateTime(bar.recordedAt)}`}
                                                title={`${formatDateTime(bar.recordedAt)} | Risk ${bar.risk}`}
                                            />
                                        ))}
                                    </div>
                                    {hoveredRiskPoint && (
                                        <div
                                            className="risk-tooltip"
                                            style={{
                                                left: `${Math.min(92, Math.max(8, hoveredRiskPoint.xPercent))}%`,
                                                top: "14%",
                                            }}
                                        >
                                            <strong>Risk: {hoveredRiskPoint.risk}</strong>
                                            <span>{formatDateTime(hoveredRiskPoint.recordedAt)}</span>
                                        </div>
                                    )}
                                    <div className="risk-axis-label risk-axis-y">Risk</div>
                                    <div className="risk-axis-label risk-axis-x">Timeline</div>
                                </div>
                                <p className="chart-caption">Click a point to view full check-in details.</p>
                            </div>
                        )}
                        {healthHistory.length > 0 && (
                            <div className="chart-wrap">
                                <h3>Risk Distribution</h3>
                                <div className="bar-chart">
                                    {riskLevelBars.map((bar) => (
                                        <div key={bar.label} className="bar-col">
                                            <div className={`bar-fill ${bar.tone}`} style={{ height: `${bar.height}%` }} />
                                            <div className="bar-value">{bar.value}</div>
                                            <div className="bar-label">{bar.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="chart-wrap">
                            <h3>Backend GET Calls (This Session)</h3>
                            <div className="insight-grid get-calls-grid">
                                <div className={`insight-card ${toneClassForApiCalls(apiCallStats.latest)}`}>
                                    <span>Latest Check-in Views</span>
                                    <strong>{apiCallStats.latest}</strong>
                                </div>
                                <div className={`insight-card ${toneClassForApiCalls(apiCallStats.trend)}`}>
                                    <span>Trend Insights Views</span>
                                    <strong>{apiCallStats.trend}</strong>
                                </div>
                                <div className={`insight-card ${toneClassForApiCalls(apiCallStats.list)}`}>
                                    <span>History List Views</span>
                                    <strong>{apiCallStats.list}</strong>
                                </div>
                                <div className={`insight-card ${toneClassForApiCalls(apiCallStats.detail)}`}>
                                    <span>Check-in Detail Views</span>
                                    <strong>{apiCallStats.detail}</strong>
                                </div>
                                <div className={`insight-card ${toneClassForApiCalls(totalGetCalls, 10, 18)}`}>
                                    <span>Total Dashboard Data Refreshes</span>
                                    <strong>{totalGetCalls}</strong>
                                </div>
                            </div>
                        </div>

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
                                        {paginatedHistory.map((entry) => (
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
                                <div className="table-pagination">
                                    <label className="field mini-field">
                                        <span>Rows</span>
                                        <select
                                            value={historyPageSize}
                                            onChange={(e) => {
                                                setHistoryPageSize(Number(e.target.value));
                                                setHistoryPage(1);
                                            }}
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={15}>15</option>
                                        </select>
                                    </label>
                                    <span className="pagination-meta">
                                        Page {historyPage} of {totalHistoryPages}
                                    </span>
                                    <button
                                        type="button"
                                        className="ghost-button control-btn"
                                        disabled={historyPage <= 1}
                                        onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        className="ghost-button control-btn"
                                        disabled={historyPage >= totalHistoryPages}
                                        onClick={() => setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isHealthLoading && healthHistory.length === 0 && (
                            <div className="empty-state-card">
                                <h3>No check-ins yet</h3>
                                <p>Submit your first health update to unlock trend insights and personalized suggestions.</p>
                                <button className="primary-button control-btn" type="button" onClick={() => setIsHealthModalOpen(true)}>
                                    Add your first check-in
                                </button>
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
                    </div>
                </section>
            )}

            <HealthCheckinModal
                open={isHealthModalOpen}
                onClose={() => setIsHealthModalOpen(false)}
                onSubmit={handleHealthSubmit}
                submitting={isSubmittingHealth}
            />

            {isSignedIn && (
                <button
                    type="button"
                    className="suggestions-fab"
                    onClick={handleOpenSuggestions}
                    aria-label="Open health suggestions assistant"
                    title="Suggestions assistant"
                >
                    <svg viewBox="0 0 24 24" className="assistant-icon-svg" aria-hidden="true">
                        <path
                            d="M12 3c-5.25 0-9.5 3.78-9.5 8.44 0 2.52 1.25 4.78 3.26 6.33-.12 1.26-.62 2.43-1.46 3.37a.75.75 0 0 0 .7 1.24c2.05-.35 3.95-1.19 5.48-2.43.5.07 1.01.11 1.52.11 5.25 0 9.5-3.78 9.5-8.44S17.25 3 12 3Zm-3.25 9.1a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm3.25 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm3.25 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
            )}

            {isSuggestionsOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal-card suggestions-modal-card">
                        <div className="modal-header">
                            <h3>Health Suggestions</h3>
                            <button type="button" className="ghost-button" onClick={() => setIsSuggestionsOpen(false)}>
                                Close
                            </button>
                        </div>
                        <p className="modal-subtitle">Latest personalized guidance from your recent check-ins.</p>

                        {isSuggestionsLoading ? (
                            <p className="status-message">Loading suggestions...</p>
                        ) : suggestionsError ? (
                            <p className="status-message error">{suggestionsError}</p>
                        ) : healthSuggestions ? (
                            <div className="suggestions-content">
                                <div className="insight-grid">
                                    <div className={`insight-card suggestion-summary ${toneClassForRisk(healthSuggestions.latest_risk_level)}`}>
                                        <span>Latest Risk Score</span>
                                        <strong>{healthSuggestions.latest_risk_score ?? "-"}</strong>
                                    </div>
                                    <div className={`insight-card suggestion-summary ${toneClassForRisk(healthSuggestions.latest_risk_level)}`}>
                                        <span>Risk Level</span>
                                        <strong>{healthSuggestions.latest_risk_level || "-"}</strong>
                                    </div>
                                    <div
                                        className={`insight-card suggestion-summary ${
                                            healthSuggestions.is_healthy ? "tone-good" : "tone-critical"
                                        }`}
                                    >
                                        <span>Healthy</span>
                                        <strong>{healthSuggestions.is_healthy ? "Yes" : "No"}</strong>
                                    </div>
                                    <div className={`insight-card suggestion-summary ${toneClassForRisk(healthSuggestions.latest_risk_level)}`}>
                                        <span>Future Outlook</span>
                                        <strong>{healthSuggestions.future_outlook || "-"}</strong>
                                    </div>
                                </div>
                                {healthSuggestions.key_risk_drivers?.length > 0 && (
                                    <div className="chart-wrap">
                                        <h3>Key Risk Drivers</h3>
                                        <div className="chip-row">
                                            {healthSuggestions.key_risk_drivers.map((driver) => (
                                                <span key={driver} className="driver-chip tone-warning">
                                                    {driver}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="chart-wrap">
                                    <h3>Predictions</h3>
                                    {healthSuggestions.predictions?.length ? (
                                        <div className="suggestion-list">
                                            {healthSuggestions.predictions.map((item) => (
                                                <div
                                                    key={item.horizon_hours}
                                                    className={`suggestion-item ${toneClassForRisk(item.risk_level)}`}
                                                >
                                                    <strong>{item.horizon_hours}h</strong>
                                                    <span>Risk: {item.risk_score} ({item.risk_level})</span>
                                                    <span>Confidence: {Math.round((item.confidence || 0) * 100)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="status-message">No prediction data available.</p>
                                    )}
                                </div>

                                <div className="chart-wrap">
                                    <h3>Warnings</h3>
                                    {healthSuggestions.warnings?.length ? (
                                        <div className="suggestion-list">
                                            {healthSuggestions.warnings.map((warning, idx) => (
                                                <div
                                                    key={`${warning.title}-${idx}`}
                                                    className={`suggestion-item ${toneClassForSeverity(warning.severity)}`}
                                                >
                                                    <strong>{warning.severity?.toUpperCase() || "WARNING"}: {warning.title}</strong>
                                                    <span>{warning.detail}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="status-message">No active warnings.</p>
                                    )}
                                </div>
                                {healthSuggestions.likely_conditions?.length > 0 && (
                                    <div className="chart-wrap">
                                        <h3>Likely Conditions</h3>
                                        <div className="suggestion-list">
                                            {healthSuggestions.likely_conditions.map((item, idx) => (
                                                <div
                                                    key={`${item.condition}-${idx}`}
                                                    className={`suggestion-item ${toneClassForSeverity(item.severity)}`}
                                                >
                                                    <strong>{item.condition || "condition"}</strong>
                                                    <span>Probability: {Math.round((item.probability || 0) * 100)}%</span>
                                                    <span>{item.rationale || "-"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="chart-wrap">
                                    <h3>Recommended Actions</h3>
                                    {healthSuggestions.suggestions?.length ? (
                                        <div className="suggestion-list">
                                            {healthSuggestions.suggestions.map((item, idx) => (
                                                <div
                                                    key={`${item.category}-${idx}`}
                                                    className={`suggestion-item ${toneClassForSuggestionCategory(item.category)}`}
                                                >
                                                    <strong>{item.category || "general"}</strong>
                                                    <span>{item.action || "-"}</span>
                                                    {item.precaution && <span>Precaution: {item.precaution}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="status-message">No suggestions available yet.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="status-message">No suggestion data available.</p>
                        )}
                    </div>
                </div>
            )}

            {isProfileOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal-card profile-modal-card">
                        <div className="modal-header">
                            <h3>User Profile</h3>
                            <button type="button" className="ghost-button" onClick={() => setIsProfileOpen(false)}>
                                Close
                            </button>
                        </div>

                        {isProfileLoading ? (
                            <p className="status-message">Loading profile...</p>
                        ) : profileData ? (
                            <div className="profile-grid">
                                <div><span>ID</span><strong>{profileData.id || "-"}</strong></div>
                                <div><span>Email</span><strong>{profileData.email || "-"}</strong></div>
                                <div><span>First Name</span><strong>{profileData.first_name || "-"}</strong></div>
                                <div><span>Last Name</span><strong>{profileData.last_name || "-"}</strong></div>
                                <div><span>Address</span><strong>{profileData.permanent_address || "-"}</strong></div>
                            </div>
                        ) : (
                            <p className="status-message error">{profileError || "Unable to load profile details."}</p>
                        )}

                        <button className="ghost-button logout-btn" type="button" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            )}

            <footer className="app-footer">Secure by design - {currentYear}</footer>

            {toasts.length > 0 && (
                <div className="toast-stack" aria-live="polite" aria-atomic="true">
                    {toasts.map((toast) => (
                        <div key={toast.id} className={`toast ${toast.variant}`}>
                            {toast.message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
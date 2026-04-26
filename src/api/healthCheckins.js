import { authFetch } from "./auth";

const BASE_URL = __BE_BASE_URL__;
const USERS_API_BASE = import.meta.env.DEV ? "/api/v1/users" : `${BASE_URL}/api/v1/users`;

export const DEFAULT_HEALTH_CHECKIN = {
    latitude: 32.2226,
    longitude: -110.9747,
    city: "Tucson",
    region: "Arizona",
    country: "USA",
    neighborhood: "Downtown",
    location_accuracy_m: 1000,
    location_source: "manual",
    body_temperature_c: 36.8,
    feeling_score: 7,
    symptoms: [],
    symptom_severities: {
        cough: 0,
        sore_throat: 0,
        headache: 0,
        body_aches: 0,
        fatigue: 2,
        nausea: 0,
        congestion: 1,
        shortness_of_breath: 0,
    },
    vitals: {
        heart_rate_bpm: 74,
        spo2_percent: 98,
        respiratory_rate_bpm: 16,
        blood_pressure_systolic: 118,
        blood_pressure_diastolic: 76,
    },
    wellness: {
        sleep_hours: 7,
        sleep_quality_score: 7,
        hydration_level_score: 7,
        stress_level_score: 4,
    },
    exposure: {
        indoor_or_outdoor: "indoor",
        mask_worn: false,
        crowded_environment: false,
        recent_travel: false,
        travel_notes: "",
        animal_contact: false,
        animal_contact_notes: "",
    },
    testing: {
        tested_positive_recently: false,
        test_type: "none",
        test_result: "not_tested",
    },
    medications_taken: [],
    recent_medications_notes: "",
    chronic_conditions: [],
    special_notices: "",
    recorded_at: new Date().toISOString(),
};

const createError = (message, userMessage) => {
    const error = new Error(message);
    error.userMessage = userMessage;
    return error;
};

export const submitHealthCheckin = async (payload) => {
    let response;

    try {
        response = await authFetch(`${USERS_API_BASE}/self/health-checkins`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
            },
            body: JSON.stringify(payload),
        });
    } catch {
        throw createError(
            "Failed to fetch",
            "Could not connect to the server. Please make sure backend is running."
        );
    }

    if (!response.ok) {
        let detail = "Unable to save health details right now.";
        try {
            const data = await response.json();
            detail = data?.detail || data?.message || detail;
        } catch {
            // keep default detail
        }
        throw createError(detail, detail);
    }

    return response.json();
};

const readJsonOrThrow = async (response, fallbackMessage) => {
    if (response.ok) return response.json();

    let detail = fallbackMessage;
    try {
        const data = await response.json();
        detail = data?.detail || data?.message || fallbackMessage;
    } catch {
        // keep fallback
    }
    throw createError(detail, detail);
};

export const fetchLatestHealthCheckin = async () => {
    try {
        const response = await authFetch(`${USERS_API_BASE}/self/health-checkins/latest`, {
            headers: { accept: "application/json" },
        });
        return await readJsonOrThrow(response, "Could not fetch latest health check-in.");
    } catch (error) {
        if (error?.userMessage) throw error;
        throw createError("Failed to fetch", "Could not fetch latest health check-in.");
    }
};

export const fetchHealthTrend = async (limit = 30) => {
    try {
        const response = await authFetch(`${USERS_API_BASE}/self/health-checkins/trend?limit=${limit}`, {
            headers: { accept: "application/json" },
        });
        return await readJsonOrThrow(response, "Could not fetch health trend.");
    } catch (error) {
        if (error?.userMessage) throw error;
        throw createError("Failed to fetch", "Could not fetch health trend.");
    }
};

export const fetchHealthCheckinList = async ({ limit = 10, since, until } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (since) params.set("since", since);
    if (until) params.set("until", until);

    try {
        const response = await authFetch(`${USERS_API_BASE}/self/health-checkins?${params.toString()}`, {
            headers: { accept: "application/json" },
        });
        return await readJsonOrThrow(response, "Could not fetch check-in history.");
    } catch (error) {
        if (error?.userMessage) throw error;
        throw createError("Failed to fetch", "Could not fetch check-in history.");
    }
};

export const fetchHealthCheckinById = async (checkinId) => {
    try {
        const response = await authFetch(`${USERS_API_BASE}/self/health-checkins/${checkinId}`, {
            headers: { accept: "application/json" },
        });
        return await readJsonOrThrow(response, "Could not fetch check-in details.");
    } catch (error) {
        if (error?.userMessage) throw error;
        throw createError("Failed to fetch", "Could not fetch check-in details.");
    }
};

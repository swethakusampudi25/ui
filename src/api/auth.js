const BASE_URL = __BE_BASE_URL__;
const API_BASE = import.meta.env.DEV ? "/api/v1/auth" : `${BASE_URL}/api/v1/auth`;
const TOKEN_KEY = "auth_token";

const createError = (message, status, userMessage) => {
    const error = new Error(message);
    error.status = status;
    error.userMessage = userMessage;
    return error;
};

export const setSessionToken = (token) => {
    sessionStorage.setItem(TOKEN_KEY, token);
};

export const getSessionToken = () => sessionStorage.getItem(TOKEN_KEY);

export const clearSessionToken = () => {
    sessionStorage.removeItem(TOKEN_KEY);
};

const parseError = async (res, fallbackMessage) => {
    let detail = fallbackMessage;

    try {
        const data = await res.json();
        const apiDetail = data?.detail;

        if (Array.isArray(apiDetail)) {
            detail = apiDetail
                .map((item) => {
                    const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : "field";
                    return `${field}: ${item?.msg || "invalid value"}`;
                })
                .join(", ");
        } else {
            detail = apiDetail || data?.message || fallbackMessage;
        }
    } catch {
        // Keep fallback message when body is not JSON
    }

    const status = res.status;

    if (status === 401) {
        throw createError(detail, status, "Incorrect email or password. Please try again.");
    }

    if (status === 404) {
        throw createError(detail, status, "We could not find this account. Please sign up first.");
    }

    if (status === 409) {
        throw createError(detail, status, "This email is already registered. Please sign in instead.");
    }

    if (status === 422) {
        throw createError(detail, status, "Some details are missing or invalid. Please check your form and try again.");
    }

    if (status >= 500) {
        throw createError(detail, status, "Server is busy right now. Please try again in a moment.");
    }

    throw createError(detail, status, "Request failed. Please try again.");
};

const postJson = async (path, payload, fallbackMessage) => {
    let res;

    try {
        res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", accept: "application/json" },
            body: JSON.stringify(payload),
        });
    } catch {
        throw createError(
            "Failed to fetch",
            0,
            "Unable to connect to server. Please check internet/backend and try again."
        );
    }

    if (!res.ok) await parseError(res, fallbackMessage);
    return res.json();
};

export const getAuthHeaders = () => {
    const token = getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const authFetch = (url, options = {}) => {
    const headers = {
        ...(options.headers || {}),
        ...getAuthHeaders(),
    };

    return fetch(url, { ...options, headers });
};

export const signup = async (data) => {
    return postJson("/signup", data, "Signup failed");
};

export const signin = async (data) => {
    const payload = await postJson("/signin", data, "Signin failed");
    if (payload?.access_token) {
        setSessionToken(payload.access_token);
    }

    return payload;
};
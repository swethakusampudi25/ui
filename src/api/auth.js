const BASE_URL = __BE_BASE_URL__;
const API_BASE = `${BASE_URL}/api/v1/auth`;
const TOKEN_KEY = "auth_token";

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

    const error = new Error(detail);
    error.status = res.status;
    throw error;
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
    const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) await parseError(res, "Signup failed");
    return res.json();
};

export const signin = async (data) => {
    const res = await fetch(`${API_BASE}/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) await parseError(res, "Signin failed");

    const payload = await res.json();
    if (payload?.access_token) {
        setSessionToken(payload.access_token);
    }

    return payload;
};
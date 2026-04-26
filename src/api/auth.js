const API_BASE = "http://127.0.0.1:8000/api/v1/auth";

export const signup = async (data) => {
    const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Signup failed");
    return res.json();
};

export const signin = async (data) => {
    const res = await fetch(`${API_BASE}/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Signin failed");
    return res.json();
};
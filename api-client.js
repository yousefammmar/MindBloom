// ============================================================
//  MindBloom — API Client
//  Talks to the Express + SQLite backend (see /backend).
//  Replaces the old Firebase layer with a real REST API.
// ============================================================

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:4000/api'
    : '/api';

const TOKEN_KEY = 'mindbloom_token';

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch (e) {
        const err = new Error('Could not reach the server. Please check your connection.');
        err.network = true;
        throw err;
    }

    let data = null;
    try { data = await res.json(); } catch { /* no body */ }

    if (!res.ok) {
        const err = new Error((data && data.error) || `Request failed (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data;
}

export const api = {
    async register(fullName, email, password) {
        const data = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ fullName, email, password }),
        });
        setToken(data.token);
        return data.user;
    },

    async login(email, password) {
        const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(data.token);
        return data.user;
    },

    async me() {
        if (!getToken()) return null;
        try {
            const data = await request('/auth/me');
            return data.user;
        } catch {
            setToken(null);
            return null;
        }
    },

    async updateProfile(patch) {
        const data = await request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(patch),
        });
        return data.user;
    },

    async getState() {
        return request('/state');
    },

    async saveState(state) {
        return request('/state', { method: 'PUT', body: JSON.stringify(state) });
    },

    logout() {
        setToken(null);
    },

    isLoggedIn() {
        return !!getToken();
    },
};

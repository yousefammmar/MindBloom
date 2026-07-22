// ============================================================
//  MindBloom — API Client
//  Talks to Express + SQLite backend, with fallback to 
//  localStorage when deployed on static hosts (e.g. GitHub Pages).
// ============================================================

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:4000/api'
    : '/api';

const TOKEN_KEY = 'mindbloom_token';
const LOCAL_USER_KEY = 'mindbloom_local_user';
const LOCAL_STATE_KEY = 'mindbloom_local_state';

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
}

function getLocalUser() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_USER_KEY));
    } catch {
        return null;
    }
}
function setLocalUser(user) {
    if (user) localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(LOCAL_USER_KEY);
}

function getLocalState() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STATE_KEY)) || {};
    } catch {
        return {};
    }
}
function setLocalState(state) {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
}

async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch (e) {
        const err = new Error('Could not reach backend server');
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
        try {
            const data = await request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ fullName, email, password }),
            });
            setToken(data.token);
            setLocalUser(data.user);
            return data.user;
        } catch (err) {
            if (err.network || err.status === 404 || err.status === 405 || err.status === 502) {
                const user = {
                    id: 'local_' + Date.now(),
                    email,
                    fullName: fullName || email.split('@')[0],
                    theme: 'forest',
                    avatarUrl: ''
                };
                setToken('mock_demo_token_' + Date.now());
                setLocalUser(user);
                return user;
            }
            throw err;
        }
    },

    async login(email, password) {
        try {
            const data = await request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            setToken(data.token);
            setLocalUser(data.user);
            return data.user;
        } catch (err) {
            if (err.network || err.status === 404 || err.status === 405 || err.status === 502) {
                let user = getLocalUser();
                if (!user || (user.email && user.email !== email)) {
                    user = {
                        id: 'local_' + Date.now(),
                        email,
                        fullName: email.split('@')[0],
                        theme: 'forest',
                        avatarUrl: ''
                    };
                }
                setToken('mock_demo_token_' + Date.now());
                setLocalUser(user);
                return user;
            }
            throw err;
        }
    },

    async me() {
        if (!getToken()) return null;
        try {
            const data = await request('/auth/me');
            setLocalUser(data.user);
            return data.user;
        } catch (err) {
            const localUser = getLocalUser();
            if (localUser) return localUser;
            const fallbackUser = { id: 'guest', email: 'student@mindbloom.app', fullName: 'MindBloom Student', theme: 'forest' };
            setLocalUser(fallbackUser);
            return fallbackUser;
        }
    },

    async updateProfile(patch) {
        try {
            const data = await request('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(patch),
            });
            setLocalUser(data.user);
            return data.user;
        } catch (err) {
            const current = getLocalUser() || {};
            const updated = { ...current, ...patch };
            setLocalUser(updated);
            return updated;
        }
    },

    async getState() {
        try {
            return await request('/state');
        } catch (err) {
            return getLocalState();
        }
    },

    async saveState(state) {
        try {
            await request('/state', { method: 'PUT', body: JSON.stringify(state) });
        } catch (err) {
            setLocalState(state);
        }
    },

    logout() {
        setToken(null);
        setLocalUser(null);
    },

    isLoggedIn() {
        return !!getToken();
    },
};


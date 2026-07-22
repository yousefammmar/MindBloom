import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

function toPublicUser(row) {
    return {
        uid: row.id,
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        avatarColor: row.avatar_color,
        avatarUrl: row.avatar_url,
        theme: row.theme,
    };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', (req, res) => {
    const { fullName, email, password } = req.body || {};

    if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
        INSERT INTO users (id, full_name, email, password_hash, avatar_color, theme)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, fullName.trim(), normalizedEmail, passwordHash, '#c084fc', 'forest');

    db.prepare(`INSERT INTO user_state (user_id) VALUES (?)`).run(id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json({ token: signToken(id), user: toPublicUser(user) });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Please enter your email and password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) return res.status(401).json({ error: 'No account found with this email.' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password. Please try again.' });

    res.json({ token: signToken(user.id), user: toPublicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: toPublicUser(user) });
});

router.put('/profile', requireAuth, (req, res) => {
    const { fullName, avatarColor, theme, password } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const nextFullName = fullName && fullName.trim() ? fullName.trim() : user.full_name;
    const nextAvatarColor = avatarColor || user.avatar_color;
    const nextTheme = theme || user.theme;
    let nextHash = user.password_hash;
    if (password) {
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        nextHash = bcrypt.hashSync(password, 10);
    }

    db.prepare(`
        UPDATE users SET full_name = ?, avatar_color = ?, theme = ?, password_hash = ?
        WHERE id = ?
    `).run(nextFullName, nextAvatarColor, nextTheme, nextHash, req.userId);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    res.json({ user: toPublicUser(updated) });
});

export default router;

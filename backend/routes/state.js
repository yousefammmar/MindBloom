import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function toPublicState(row) {
    if (!row) return { events: [], tasks: [], focusTime: 0, filters: [], categories: [], dailyGoals: {} };
    return {
        events: JSON.parse(row.events),
        tasks: JSON.parse(row.tasks),
        focusTime: row.focus_time,
        filters: JSON.parse(row.filters),
        categories: JSON.parse(row.categories),
        dailyGoals: JSON.parse(row.daily_goals),
    };
}

router.get('/', requireAuth, (req, res) => {
    const row = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(req.userId);
    res.json(toPublicState(row));
});

router.put('/', requireAuth, (req, res) => {
    const { events, tasks, focusTime, filters, categories, dailyGoals } = req.body || {};

    const existing = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(req.userId);
    const merged = {
        events: events !== undefined ? events : (existing ? JSON.parse(existing.events) : []),
        tasks: tasks !== undefined ? tasks : (existing ? JSON.parse(existing.tasks) : []),
        focusTime: focusTime !== undefined ? focusTime : (existing ? existing.focus_time : 0),
        filters: filters !== undefined ? filters : (existing ? JSON.parse(existing.filters) : []),
        categories: categories !== undefined ? categories : (existing ? JSON.parse(existing.categories) : []),
        dailyGoals: dailyGoals !== undefined ? dailyGoals : (existing ? JSON.parse(existing.daily_goals) : {}),
    };

    db.prepare(`
        INSERT INTO user_state (user_id, events, tasks, focus_time, filters, categories, daily_goals, updated_at)
        VALUES (@userId, @events, @tasks, @focusTime, @filters, @categories, @dailyGoals, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
            events = @events, tasks = @tasks, focus_time = @focusTime,
            filters = @filters, categories = @categories, daily_goals = @dailyGoals,
            updated_at = datetime('now')
    `).run({
        userId: req.userId,
        events: JSON.stringify(merged.events),
        tasks: JSON.stringify(merged.tasks),
        focusTime: merged.focusTime,
        filters: JSON.stringify(merged.filters),
        categories: JSON.stringify(merged.categories),
        dailyGoals: JSON.stringify(merged.dailyGoals),
    });

    res.json({ ok: true });
});

export default router;

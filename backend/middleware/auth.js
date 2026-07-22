import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mindbloom-dev-secret-change-in-production';

export function signToken(userId) {
    return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.uid;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
}

export { JWT_SECRET };

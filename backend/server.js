import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import stateRoutes from './routes/state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/state', stateRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mindbloom-api' }));

// Serve the frontend (single deployable app)
const publicDir = path.join(__dirname, '..', 'public');

app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'landing.html')));
app.get('/app', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

app.use(express.static(publicDir, { index: false }));

app.listen(PORT, () => {
    console.log(`MindBloom server running at http://localhost:${PORT}`);
});

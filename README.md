# MindBloom

A full-stack academic dashboard: dynamic calendar, Pomodoro timer, daily stats,
quick tasks, and goals — now backed by a real Express + SQLite API instead of
Firebase or localStorage.

## Project structure

```
mindbloom/
├── backend/          Express API + SQLite database
│   ├── server.js
│   ├── db.js
│   ├── middleware/auth.js
│   └── routes/ (auth.js, state.js)
└── public/           Frontend (served by the backend)
    ├── landing.html   Marketing / welcome page
    ├── index.html     The dashboard app
    ├── api-client.js  Talks to the backend API
    ├── script.js      App logic
    └── style-*.css    Forest & Ramadan themes
```

## Running locally

```bash
npm install
npm start
```

The server starts on **http://localhost:4000**:
- `/` → landing page
- `/app` or `/index.html` → the dashboard
- `/api/...` → the REST API

A SQLite database file (`backend/mindbloom.db`) is created automatically on
first run — no external database setup needed.

## Deployment Options (100% Free)

### 1. GitHub Pages (Instant Free Live Demo)
- **Live URL**: [https://yousefammmar.github.io/MindBloom/](https://yousefammmar.github.io/MindBloom/)
- **Features**: Pre-built static deployment with zero configuration. Includes a browser-side LocalStorage database fallback so users can interact with all planner features, Pomodoro timer, tasks, and calendar events immediately.

### 2. Vercel (1-Click Free Full-Stack Serverless)
- Connect `yousefammmar/MindBloom` on [Vercel.com](https://vercel.com).
- Uses the included [`vercel.json`](file:///Users/yousefodeh/Downloads/mindbloom/vercel.json) to deploy both the Express API and static frontend automatically.

### 3. Render.com (Express Server + Persistent SQLite DB)
- Connect `yousefammmar/MindBloom` on [Render.com](https://render.com) via **New + → Blueprint**.
- Uses [`render.yaml`](file:///Users/yousefodeh/Downloads/mindbloom/render.yaml) to host the full Node.js Express server + SQLite database.



- **Accounts**: email + password, hashed with bcrypt, sessions via JWT
  (stored in the browser's localStorage as `mindbloom_token`, sent as a
  Bearer token on every API request).
- **Data**: each user's events, tasks, focus time, filters, categories, and
  daily goals are stored server-side as JSON in the `user_state` table and
  synced automatically (debounced) whenever you make a change — no more
  data trapped in one browser.

## API reference

| Method | Route              | Description                          |
|--------|--------------------|---------------------------------------|
| POST   | `/api/auth/register` | Create an account                   |
| POST   | `/api/auth/login`    | Sign in                             |
| GET    | `/api/auth/me`        | Get the current user (needs token)  |
| PUT    | `/api/auth/profile`   | Update name / avatar / theme / password |
| GET    | `/api/state`           | Get the current user's saved data   |
| PUT    | `/api/state`           | Save the current user's data        |

## Developers
- **Yousef**: Developer
- **Tasneem**: Designer
- **Fatema**: Researcher

---
*Created for the Advanced Agentic Coding course.*

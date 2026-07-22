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

## Deployment Options

### 1. Full-Stack Cloud Deployment (Backend + SQLite Database)
To deploy the entire Express backend, SQLite database, and frontend UI to a live URL:
- **Render**: Connect `https://github.com/yousefammmar/MindBloom` on [Render.com](https://render.com). It will automatically detect `render.yaml` and deploy the live Node.js Express server + SQLite database.
- **Railway / Koyeb / Fly.io**: Import the GitHub repo and run `npm start`.

### 2. Static Frontend Deployment (GitHub Pages)
- **Live Demo**: [https://yousefammmar.github.io/MindBloom/](https://yousefammmar.github.io/MindBloom/)
- Includes a client-side localStorage fallback for demoing the full interface on static hosting without a backend.


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

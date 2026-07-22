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

## Running it

```bash
cd backend
npm install
npm start
```

The server starts on **http://localhost:4000**:
- `/` → landing page
- `/app` or `/index.html` → the dashboard
- `/api/...` → the REST API

A SQLite database file (`backend/mindbloom.db`) is created automatically on
first run — no external database to set up.

For development with auto-restart on file changes:

```bash
npm run dev
```

### Configuration

Copy `backend/.env.example` to `backend/.env` and set a real `JWT_SECRET`
before deploying anywhere public. Locally the app works out of the box with
a development default.

## How auth & data work

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

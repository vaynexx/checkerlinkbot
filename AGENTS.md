# AGENTS.md

## Purpose
This repository contains a small two-part app for managing Telegram join requests and invite links.

## Project structure
- `backend/`: Express API server, Telegram bot, local SQLite database, and `links.json` storage.
- `frontend/`: Vite + React UI with Tailwind CSS for search and link management.

## How to run
### Backend
1. `cd backend`
2. `npm install`
3. `node server.js`

The backend starts an Express API on `http://localhost:5000` and also runs the Telegram bot via `backend/bot.js`.

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

Use `npm run build` to build production assets and `npm run lint` to run ESLint.

## Important files
- `backend/server.js`: main API server, SQLite database initialization, Telegram invite link creation endpoints.
- `backend/bot.js`: Telegram bot event handling (`chat_join_request`, commands, link menu actions).
- `backend/storage.js`: link normalization, `links.json` read/write, join request storage.
- `backend/config.js`: environment-backed configuration for `BOT_TOKEN`, `CHANNEL_ID`, `DATABASE_PATH`, and `LINKS_DB`.
- `frontend/src/App.jsx`: top-level React UI, search, create link modal, and API calls.
- `frontend/src/Dashboard.jsx`: admin links dashboard and link management UI.
- `frontend/vite.config.js`: Vite config, includes a custom allowed host for an ngrok domain.

## Key conventions
- The backend stores join requests in SQLite and also persists link metadata in `backend/links.json`.
- The frontend communicates with `http://localhost:5000` directly; the backend must be running for UI flows to work.
- `backend/config.js` reads sensitive values from environment variables but includes defaults in code.
- The repository is not a monorepo with a single root package; backend and frontend are separate npm projects.

## Agent guidance
- Prefer making changes in `backend/server.js` / `backend/bot.js` for API and Telegram workflow updates.
- Prefer `frontend/src/App.jsx` / `frontend/src/Dashboard.jsx` / `frontend/components/*` for UI and frontend logic.
- Avoid editing generated build output under `frontend/dist/` unless needed for debugging build issues.

## Notes
- There is no repository-level README or existing `AGENTS.md` / copilot custom instructions file.
- Use the frontend and backend package scripts directly rather than assuming a root `package.json`.

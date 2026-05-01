# TaskFlow — Team Task Manager

A simple, full-stack team task management app. Create projects, invite teammates, assign tasks, and track progress with clear status columns and an at-a-glance dashboard.

## Features

- **Authentication** — Email/password signup and login with JWT tokens (httpOnly cookies + Bearer header fallback)
- **Role-based access control** — Admin and Member roles. Admins manage the team and have full visibility.
- **Projects** — Create projects, add members, edit or delete. Only the owner (or an admin) can delete a project.
- **Tasks** — Title, description, assignee, priority (low/medium/high), status (todo / in progress / done), due date.
- **Kanban board** — Drag-free kanban with one-click status changes per task.
- **Dashboard** — Count of projects, total tasks, tasks in progress, completed, overdue, and assigned to you.
- **Team management** — Admins can promote/demote or remove users.

## Tech Stack

- **Backend:** FastAPI, MongoDB (Motor), PyJWT, bcrypt
- **Frontend:** React 19, React Router, shadcn/ui, Tailwind CSS, Axios
- **Auth:** JWT (httpOnly cookies + Bearer token)

## Project Structure

```
backend/
  server.py          # FastAPI app — auth, projects, tasks, dashboard
  requirements.txt
  .env               # MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_*
frontend/
  src/
    App.js
    context/AuthContext.jsx
    components/AppShell.jsx, ProtectedRoute.jsx
    pages/           # Login, Register, Dashboard, Projects, ProjectDetail, Tasks, Team
    lib/api.js
```

## Running locally

1. **MongoDB** — make sure a MongoDB instance is reachable at `MONGO_URL`.
2. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn server:app --reload --port 8001
   ```
3. **Frontend:**
   ```bash
   cd frontend
   yarn install
   yarn start
   ```

The frontend expects `REACT_APP_BACKEND_URL` to point at the backend base URL (without `/api`).

## Default admin account

Seeded automatically on first boot from the `.env` file:

- **Email:** `admin@taskflow.com`
- **Password:** `Admin@123`

## REST API (high-level)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh

GET    /api/users                        # list users
PATCH  /api/users/{id}/role              # admin only
DELETE /api/users/{id}                   # admin only

POST   /api/projects                     # create
GET    /api/projects                     # list (admin sees all; member sees theirs)
GET    /api/projects/{id}
PATCH  /api/projects/{id}
DELETE /api/projects/{id}

POST   /api/tasks
GET    /api/tasks?project_id=&assignee_id=&status_=
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}

GET    /api/dashboard/stats
```

## Deployment (Railway)

1. Push this repo to GitHub.
2. Create a new Railway project. Add two services — one for the FastAPI backend (`backend/`) and one for the React frontend (`frontend/`). Also provision a MongoDB plugin.
3. **Backend env vars:**
   - `MONGO_URL` — from the Railway MongoDB plugin
   - `DB_NAME` — e.g. `taskflow_db`
   - `JWT_SECRET` — a long random string
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. **Frontend env var:**
   - `REACT_APP_BACKEND_URL` — the public URL of the backend service
   - Build command: `yarn install && yarn build`
   - Start command: `npx serve -s build -l $PORT`

## License

MIT — use it however you like.

TASKFLOW - TEAM TASK MANAGER
=============================

A simple, full-stack team task management app. Create projects, invite
teammates, assign tasks, and track progress with a clear kanban board
and at-a-glance dashboard.

--------------------------------------------------
FEATURES
--------------------------------------------------
- Authentication: Email/password signup and login with JWT
  (httpOnly cookies + Bearer token fallback)
- Role-based access control: Admin and Member roles
- Projects: Create, edit, delete. Add team members.
  Only the owner or an admin can delete a project.
- Tasks: Title, description, assignee, priority
  (low / medium / high), status (todo / in progress / done), due date
- Kanban board: One-click status change per task
- Dashboard: Projects count, total tasks, in progress, completed,
  overdue, and tasks assigned to you
- Team management: Admins can promote/demote or remove users

--------------------------------------------------
TECH STACK
--------------------------------------------------
Backend:  FastAPI, MongoDB (Motor), PyJWT, bcrypt
Frontend: React 19, React Router, shadcn/ui, Tailwind CSS, Axios
Auth:     JWT (httpOnly cookies + Bearer token)

--------------------------------------------------
PROJECT STRUCTURE
--------------------------------------------------
backend/
  server.py          FastAPI app - auth, projects, tasks, dashboard
  requirements.txt
  .env               MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_*

frontend/
  src/
    App.js
    context/AuthContext.jsx
    components/AppShell.jsx, ProtectedRoute.jsx
    pages/           Login, Register, Dashboard, Projects,
                     ProjectDetail, Tasks, Team
    lib/api.js

--------------------------------------------------
RUNNING LOCALLY
--------------------------------------------------
1) MongoDB - make sure a MongoDB instance is reachable at MONGO_URL.

2) Backend:
     cd backend
     pip install -r requirements.txt
     uvicorn server:app --reload --port 8001

3) Frontend:
     cd frontend
     yarn install
     yarn start

The frontend expects REACT_APP_BACKEND_URL to point at the backend
base URL (without /api).

--------------------------------------------------
DEFAULT ADMIN ACCOUNT
--------------------------------------------------
Seeded automatically on first boot from the .env file:

  Email:    admin@taskflow.com
  Password: Admin@123

--------------------------------------------------
REST API (HIGH-LEVEL)
--------------------------------------------------
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh

GET    /api/users                    list users
PATCH  /api/users/{id}/role          admin only
DELETE /api/users/{id}               admin only

POST   /api/projects                 create
GET    /api/projects                 list (admin sees all)
GET    /api/projects/{id}
PATCH  /api/projects/{id}
DELETE /api/projects/{id}

POST   /api/tasks
GET    /api/tasks?project_id=&assignee_id=&status_=
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}

GET    /api/dashboard/stats

--------------------------------------------------
DEPLOYMENT ON RAILWAY
--------------------------------------------------
1) Push this repo to GitHub.

2) Create a new Railway project.
   - Add a MongoDB plugin.
   - Add a backend service (root: /backend).
   - Add a frontend service (root: /frontend).

3) Backend environment variables:
     MONGO_URL       (from the Railway MongoDB plugin)
     DB_NAME         e.g. taskflow_db
     JWT_SECRET      long random string
     ADMIN_EMAIL     admin@taskflow.com
     ADMIN_PASSWORD  Admin@123
   Start command:
     uvicorn server:app --host 0.0.0.0 --port $PORT

4) Frontend environment variable:
     REACT_APP_BACKEND_URL   public URL of the backend service
   Build command:
     yarn install && yarn build
   Start command:
     npx serve -s build -l $PORT

--------------------------------------------------
LICENSE
--------------------------------------------------
MIT - use it however you like.

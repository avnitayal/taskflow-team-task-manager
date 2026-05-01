from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MIN = 60 * 24  # 1 day
REFRESH_TOKEN_DAYS = 7

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="TaskFlow API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("taskflow")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: str


class ProjectIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = Field("", max_length=1000)
    member_ids: List[str] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    member_ids: Optional[List[str]] = None


class TaskIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=2000)
    project_id: str
    assignee_id: Optional[str] = None
    priority: str = Field("medium")  # low | medium | high
    status: str = Field("todo")  # todo | in_progress | done
    due_date: Optional[str] = None  # ISO date string


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None


class RoleUpdate(BaseModel):
    role: str  # admin | member


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie("access_token", access, httponly=True, secure=False,
                        samesite="lax", max_age=ACCESS_TOKEN_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False,
                        samesite="lax", max_age=REFRESH_TOKEN_DAYS * 86400, path="/")


def serialize_user(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "name": doc["name"],
        "email": doc["email"],
        "role": doc.get("role", "member"),
        "created_at": doc["created_at"],
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "member",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)

    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {"user": serialize_user(user), "access_token": access, "refresh_token": refresh}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {"user": serialize_user(user), "access_token": access, "refresh_token": refresh}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access = create_access_token(user["id"], user["email"])
    response.set_cookie("access_token", access, httponly=True, secure=False,
                        samesite="lax", max_age=ACCESS_TOKEN_MIN * 60, path="/")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Users (Admin)
# ---------------------------------------------------------------------------
@api.get("/users")
async def list_users(_: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@api.patch("/users/{user_id}/role")
async def update_role(user_id: str, body: RoleUpdate, admin: dict = Depends(require_admin)):
    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": body.role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return user


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    # Unassign from tasks, remove from projects
    await db.tasks.update_many({"assignee_id": user_id}, {"$set": {"assignee_id": None}})
    await db.projects.update_many({}, {"$pull": {"member_ids": user_id}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------
async def _project_visible(user: dict, project: dict) -> bool:
    if user["role"] == "admin":
        return True
    return user["id"] == project.get("owner_id") or user["id"] in project.get("member_ids", [])


@api.post("/projects")
async def create_project(body: ProjectIn, user: dict = Depends(get_current_user)):
    project = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "description": body.description.strip(),
        "owner_id": user["id"],
        "member_ids": list(set(body.member_ids + [user["id"]])),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)
    return project


@api.get("/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        query = {}
    else:
        query = {"$or": [{"owner_id": user["id"]}, {"member_ids": user["id"]}]}
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return projects


@api.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not await _project_visible(user, project):
        raise HTTPException(status_code=403, detail="Access denied")
    return project


@api.patch("/projects/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user["role"] != "admin" and project["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only project owner or admin can edit")

    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "member_ids" in update:
        update["member_ids"] = list(set(update["member_ids"] + [project["owner_id"]]))
    if update:
        await db.projects.update_one({"id": project_id}, {"$set": update})
    return await db.projects.find_one({"id": project_id}, {"_id": 0})


@api.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user["role"] != "admin" and project["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only project owner or admin can delete")
    await db.projects.delete_one({"id": project_id})
    await db.tasks.delete_many({"project_id": project_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------
ALLOWED_STATUS = {"todo", "in_progress", "done"}
ALLOWED_PRIORITY = {"low", "medium", "high"}


@api.post("/tasks")
async def create_task(body: TaskIn, user: dict = Depends(get_current_user)):
    if body.status not in ALLOWED_STATUS:
        raise HTTPException(status_code=400, detail="Invalid status")
    if body.priority not in ALLOWED_PRIORITY:
        raise HTTPException(status_code=400, detail="Invalid priority")

    project = await db.projects.find_one({"id": body.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not await _project_visible(user, project):
        raise HTTPException(status_code=403, detail="Not a member of this project")

    if body.assignee_id:
        assignee = await db.users.find_one({"id": body.assignee_id}, {"_id": 0})
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee not found")

    task = {
        "id": str(uuid.uuid4()),
        "title": body.title.strip(),
        "description": body.description.strip(),
        "project_id": body.project_id,
        "assignee_id": body.assignee_id,
        "priority": body.priority,
        "status": body.status,
        "due_date": body.due_date,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tasks.insert_one(task)
    task.pop("_id", None)
    return task


@api.get("/tasks")
async def list_tasks(
    project_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    status_: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if project_id:
        query["project_id"] = project_id
    if assignee_id:
        query["assignee_id"] = assignee_id
    if status_:
        query["status"] = status_

    # Limit to projects the user can see
    if user["role"] != "admin":
        visible = await db.projects.find(
            {"$or": [{"owner_id": user["id"]}, {"member_ids": user["id"]}]},
            {"_id": 0, "id": 1},
        ).to_list(1000)
        visible_ids = [p["id"] for p in visible]
        if "project_id" in query and query["project_id"] not in visible_ids:
            return []
        if "project_id" not in query:
            query["project_id"] = {"$in": visible_ids}

    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return tasks


@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = await db.projects.find_one({"id": task["project_id"]}, {"_id": 0})
    if not project or not await _project_visible(user, project):
        raise HTTPException(status_code=403, detail="Access denied")

    update = body.model_dump(exclude_none=True)
    if "status" in update and update["status"] not in ALLOWED_STATUS:
        raise HTTPException(status_code=400, detail="Invalid status")
    if "priority" in update and update["priority"] not in ALLOWED_PRIORITY:
        raise HTTPException(status_code=400, detail="Invalid priority")

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tasks.update_one({"id": task_id}, {"$set": update})
    return await db.tasks.find_one({"id": task_id}, {"_id": 0})


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project = await db.projects.find_one({"id": task["project_id"]}, {"_id": 0})
    if user["role"] != "admin" and project["owner_id"] != user["id"] and task["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.tasks.delete_one({"id": task_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    # Projects visible to the user
    if user["role"] == "admin":
        projects_query = {}
    else:
        projects_query = {"$or": [{"owner_id": user["id"]}, {"member_ids": user["id"]}]}

    project_ids = [p["id"] for p in await db.projects.find(projects_query, {"_id": 0, "id": 1}).to_list(1000)]
    task_query = {"project_id": {"$in": project_ids}} if project_ids else {"_id": "__none__"}

    tasks = await db.tasks.find(task_query, {"_id": 0}).to_list(5000) if project_ids else []
    today = datetime.now(timezone.utc).date().isoformat()

    total = len(tasks)
    by_status = {"todo": 0, "in_progress": 0, "done": 0}
    by_priority = {"low": 0, "medium": 0, "high": 0}
    overdue = 0
    mine = 0

    for t in tasks:
        by_status[t.get("status", "todo")] = by_status.get(t.get("status", "todo"), 0) + 1
        by_priority[t.get("priority", "medium")] = by_priority.get(t.get("priority", "medium"), 0) + 1
        if t.get("assignee_id") == user["id"]:
            mine += 1
        due = t.get("due_date")
        if due and due < today and t.get("status") != "done":
            overdue += 1

    return {
        "projects": len(project_ids),
        "total_tasks": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "overdue": overdue,
        "my_tasks": mine,
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_start():
    await db.users.create_index("email", unique=True)
    await db.projects.create_index("owner_id")
    await db.tasks.create_index("project_id")
    await db.tasks.create_index("assignee_id")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@taskflow.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("Seeded admin user: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

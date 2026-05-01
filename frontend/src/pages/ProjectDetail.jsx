import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const STATUSES = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

const PRIORITY_COLORS = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  // task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, t, u] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks`, { params: { project_id: id } }),
        api.get(`/users`),
      ]);
      setProject(p.data);
      setTasks(t.data);
      setUsers(u.data);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) navigate("/projects");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const memberUsers = users.filter((u) => project?.member_ids?.includes(u.id));
  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  const onCreateTask = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/tasks", {
        title, description, project_id: id,
        assignee_id: assigneeId || null,
        priority, status: "todo",
        due_date: dueDate || null,
      });
      setTitle(""); setDescription(""); setAssigneeId(""); setPriority("medium"); setDueDate("");
      setOpen(false);
      load();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (taskId, status) => {
    await api.patch(`/tasks/${taskId}`, { status });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    await api.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const deleteProject = async () => {
    if (!window.confirm("Delete this project and all its tasks?")) return;
    await api.delete(`/projects/${id}`);
    navigate("/projects");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (!project) return null;

  const canEditProject = user.role === "admin" || project.owner_id === user.id;

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s.key] = tasks.filter((t) => t.status === s.key);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="project-detail-page">
      <div>
        <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" data-testid="project-name">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {project.description || "No description."}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {memberUsers.map((m) => (
                <span key={m.id} className="text-xs bg-secondary px-2 py-1 rounded-full">
                  {m.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="new-task-btn"><Plus className="h-4 w-4 mr-1" /> New task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create task</DialogTitle>
                </DialogHeader>
                <form onSubmit={onCreateTask} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="task-title-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} data-testid="task-description-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Assignee</Label>
                      <Select value={assigneeId || "none"} onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}>
                        <SelectTrigger data-testid="task-assignee-select"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {memberUsers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="task-due-date-input" />
                  </div>
                  {error && <div className="text-sm text-destructive">{error}</div>}
                  <DialogFooter>
                    <Button type="submit" disabled={saving} data-testid="task-create-submit">
                      {saving ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {canEditProject && (
              <Button variant="outline" onClick={deleteProject} data-testid="delete-project-btn">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4" data-testid="kanban-board">
        {STATUSES.map((s) => (
          <div key={s.key} className="card-soft p-4" data-testid={`column-${s.key}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{s.label}</h3>
              <span className="text-xs bg-secondary rounded-full px-2 py-0.5 font-semibold">
                {tasksByStatus[s.key].length}
              </span>
            </div>
            <div className="space-y-3 min-h-[120px]">
              {tasksByStatus[s.key].map((t) => (
                <div key={t.id} className="border border-border rounded-md p-3 bg-white hover:shadow-sm transition-shadow" data-testid={`task-card-${t.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium text-sm flex-1">{t.title}</div>
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="text-muted-foreground hover:text-destructive"
                      data-testid={`delete-task-${t.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>
                      {t.priority}
                    </span>
                    {t.due_date && (
                      <span className="text-[11px] text-muted-foreground">Due {t.due_date}</span>
                    )}
                    {t.assignee_id && userById[t.assignee_id] && (
                      <span className="text-[11px] text-muted-foreground">· {userById[t.assignee_id].name}</span>
                    )}
                  </div>
                  <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                    <SelectTrigger className="h-8 text-xs" data-testid={`task-status-select-${t.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

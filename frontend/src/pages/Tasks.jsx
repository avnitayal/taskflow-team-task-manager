import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";

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

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("mine"); // mine | all | overdue
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, p, u] = await Promise.all([
        api.get("/tasks"),
        api.get("/projects"),
        api.get("/users"),
      ]);
      setTasks(t.data); setProjects(p.data); setUsers(u.data);
      setLoading(false);
    })();
  }, []);

  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));
  const userById = Object.fromEntries(users.map((u) => [u.id, u]));
  const today = new Date().toISOString().slice(0, 10);

  const updateStatus = async (taskId, status) => {
    await api.patch(`/tasks/${taskId}`, { status });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const filtered = tasks.filter((t) => {
    if (filter === "mine" && t.assignee_id !== user.id) return false;
    if (filter === "overdue" && !(t.due_date && t.due_date < today && t.status !== "done")) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <header>
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">Track every task across every project you&apos;re on.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-border bg-white p-1">
          {[
            { k: "mine", l: "My tasks" },
            { k: "all", l: "All" },
            { k: "overdue", l: "Overdue" },
          ].map((b) => (
            <button
              key={b.k}
              onClick={() => setFilter(b.k)}
              data-testid={`filter-${b.k}`}
              className={`px-3 py-1.5 text-sm rounded ${
                filter === b.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.l}
            </button>
          ))}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div className="card-soft p-10 text-center text-sm text-muted-foreground">No tasks match your filters.</div>
      ) : (
        <div className="card-soft overflow-hidden" data-testid="tasks-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Project</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Assignee</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const overdue = t.due_date && t.due_date < today && t.status !== "done";
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {projectById[t.project_id] ? (
                        <Link to={`/projects/${t.project_id}`} className="hover:underline">
                          {projectById[t.project_id].name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {t.assignee_id ? userById[t.assignee_id]?.name || "—" : "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className={`px-4 py-3 hidden sm:table-cell ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {t.due_date || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                        <SelectTrigger className="h-8 w-[140px] text-xs" data-testid={`row-status-${t.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

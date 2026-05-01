import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock3, Folder, Inbox, User } from "lucide-react";

function StatCard({ label, value, icon: Icon, testId, tone = "default" }) {
  const tones = {
    default: "bg-white",
    warn: "bg-[#fff8e7]",
    ok: "bg-[#ecf7ef]",
    me: "bg-[#eef2ff]",
  };
  return (
    <div className={`card-soft p-5 ${tones[tone]}`} data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          {label}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/tasks"),
        ]);
        setStats(s.data);
        setTasks(t.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const myTasks = tasks.filter((t) => t.assignee_id === user.id).slice(0, 6);
  const overdueTasks = tasks
    .filter((t) => t.due_date && t.due_date < today && t.status !== "done")
    .slice(0, 6);

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <header>
        <h1 className="text-3xl font-bold">Good to see you, {user.name.split(" ")[0]}.</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s on your plate today.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Projects" value={stats.projects} icon={Folder} testId="stat-projects" />
        <StatCard label="All tasks" value={stats.total_tasks} icon={Inbox} testId="stat-total-tasks" />
        <StatCard label="In progress" value={stats.by_status.in_progress} icon={Clock3} testId="stat-in-progress" />
        <StatCard label="Completed" value={stats.by_status.done} icon={CheckCircle2} testId="stat-done" tone="ok" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} testId="stat-overdue" tone="warn" />
        <StatCard label="Assigned to me" value={stats.my_tasks} icon={User} testId="stat-mine" tone="me" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card-soft p-5" data-testid="my-tasks-widget">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Your tasks</h2>
            <Link to="/tasks" className="text-xs text-primary font-semibold hover:underline">
              View all
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nothing assigned. Enjoy the quiet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {myTasks.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {t.status.replace("_", " ")} &middot; {t.priority} priority
                    </div>
                  </div>
                  {t.due_date && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Due {t.due_date}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-5" data-testid="overdue-widget">
          <h2 className="font-bold text-lg mb-4">Overdue</h2>
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nothing overdue. Keep it up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {overdueTasks.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-destructive">Due {t.due_date}</div>
                  </div>
                  <span className="text-xs uppercase font-semibold text-muted-foreground">
                    {t.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

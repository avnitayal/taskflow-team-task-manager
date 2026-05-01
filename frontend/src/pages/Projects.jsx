import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Folder, Users as UsersIcon } from "lucide-react";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [p, u] = await Promise.all([api.get("/projects"), api.get("/users")]);
    setProjects(p.data);
    setUsers(u.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/projects", { name, description, member_ids: memberIds });
      setName(""); setDescription(""); setMemberIds([]);
      setOpen(false);
      load();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (id) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6" data-testid="projects-page">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Group related work and invite your team.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-project-btn">
              <Plus className="h-4 w-4 mr-1" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="new-project-dialog">
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required data-testid="project-name-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} data-testid="project-description-input" />
              </div>
              <div className="space-y-1.5">
                <Label>Team members</Label>
                <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 space-y-1">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-sm py-1 px-2 hover:bg-secondary rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                        data-testid={`project-member-${u.id}`}
                      />
                      <span className="flex-1">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <DialogFooter>
                <Button type="submit" disabled={saving} data-testid="project-create-submit">
                  {saving ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="card-soft p-10 text-center">
          <Folder className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <div className="font-semibold">No projects yet</div>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first project to start organizing tasks.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-grid">
          {projects.map((p) => (
            <Link
              to={`/projects/${p.id}`}
              key={p.id}
              className="card-soft p-5 hover:border-primary/50 transition-colors"
              data-testid={`project-card-${p.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <UsersIcon className="h-3 w-3" /> {p.member_ids?.length || 0}
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1 line-clamp-1">{p.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                {p.description || "No description"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Outlet, useNavigate, Link, useParams, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sun, Moon, LogOut, Loader2, MessageSquare } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();

  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      const current = router.state.location.pathname;
      if (current.includes(id)) navigate({ to: "/chat" });
    },
  });

  // Active thread from URL
  let activeId: string | undefined;
  try {
    const params = useParams({ strict: false }) as { threadId?: string };
    activeId = params.threadId;
  } catch {
    activeId = undefined;
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex w-72 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-4 flex items-center gap-2.5">
          <img src={logo} alt="" width={32} height={32} className="rounded-lg" />
          <div className="leading-tight">
            <div className="font-semibold text-sm">Rafiki AI</div>
            <div className="text-[11px] text-muted-foreground">By Mr Daudi Kalunde</div>
          </div>
        </div>
        <div className="px-3">
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full justify-start gap-2" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <div className="px-2 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">History</div>
          {isLoading ? (
            <div className="px-2 text-xs text-muted-foreground">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="px-2 text-xs text-muted-foreground">No conversations yet.</div>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
                  activeId === t.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
                }`}
              >
                <Link to="/chat/$threadId" params={{ threadId: t.id }} className="flex-1 flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{t.title}</span>
                </Link>
                <button
                  onClick={() => del.mutate(t.id)}
                  className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-sidebar-border flex items-center gap-2">
          <div className="flex-1 min-w-0 text-xs">
            <div className="truncate font-medium">{user.email}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={toggle} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
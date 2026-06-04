import { createFileRoute, Outlet, useNavigate, Link, useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sun, Moon, LogOut, Loader2, MessageSquare, Settings2, Volume2, VolumeX, Menu, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useVoiceSettings } from "@/lib/voice-settings";
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
  const voice = useVoiceSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0 flex" : "-translate-x-full flex"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-xs text-muted-foreground">Menyu</span>
          <Button size="icon" variant="ghost" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Settings">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold">Mipangilio</div>
                <div className="text-xs text-muted-foreground">Badilisha mwonekano na sauti.</div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark" className="text-sm">Dark mode</Label>
                <Switch id="dark" checked={theme === "dark"} onCheckedChange={toggle} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="autospeak" className="text-sm flex items-center gap-1.5">
                  {voice.autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  Sema majibu
                </Label>
                <Switch id="autospeak" checked={voice.autoSpeak} onCheckedChange={voice.setAutoSpeak} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sauti ya AI</Label>
                <Select
                  value={voice.voiceURI ?? "default"}
                  onValueChange={(v) => voice.setVoiceURI(v === "default" ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Chagua sauti" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="default">Sauti chaguomsingi</SelectItem>
                    {voice.voices.map((v) => (
                      <SelectItem key={v.voiceURI} value={v.voiceURI}>
                        {v.name} {v.lang ? `· ${v.lang}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {voice.voices.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Hakuna sauti zilizopatikana kwenye kifaa hiki.</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button size="icon" variant="ghost" onClick={toggle} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/60 backdrop-blur">
          <Button size="icon" variant="ghost" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-6 w-6 rounded-md" />
            <span className="text-sm font-semibold">Rafiki AI</span>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
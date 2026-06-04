import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/chat.functions";
import { Loader2, Plus } from "lucide-react";
import { Sparkles, MessageSquare, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatIndex,
});

function ChatIndex() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isChatIndex = pathname === "/chat";

  return isChatIndex ? <Welcome /> : <Outlet />;
}

function Welcome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createThread);
  const create = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
    },
  });

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-10">
      <div className="text-center max-w-xl">
        <img src={logo} alt="Rafiki AI" className="mx-auto h-24 w-24 rounded-2xl object-cover shadow-[var(--shadow-glow)]" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          Karibu <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Rafiki AI</span> 👋
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Mimi ni rafiki yako wa AI — niko hapa kukusaidia kwa lugha yoyote, wakati wowote.
          Uliza swali, tafuta wazo, au piga gumzo tu. 💬
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="rounded-xl border border-border p-3 bg-card">
            <Sparkles className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-xs text-muted-foreground">Majibu ya kina kwa Kiswahili, Kiingereza, na zaidi.</p>
          </div>
          <div className="rounded-xl border border-border p-3 bg-card">
            <MessageSquare className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-xs text-muted-foreground">Mazungumzo yako huhifadhiwa ili urejee wakati wowote.</p>
          </div>
          <div className="rounded-xl border border-border p-3 bg-card">
            <Mic className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-xs text-muted-foreground">Ongea badala ya kuandika — bonyeza ikoni ya maikrofoni.</p>
          </div>
        </div>
        <Button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          size="lg"
          className="mt-8 gap-2"
          style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Anza mazungumzo mapya
        </Button>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Rafiki AI — Created by Mr Daudi Kalunde from Tanzania 🇹🇿
        </p>
      </div>
    </div>
  );
}
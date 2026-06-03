import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/chat.functions";
import { Loader2, Plus } from "lucide-react";
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
    <div className="flex-1 flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <img src={logo} alt="Rafiki AI" width={88} height={88} className="mx-auto rounded-2xl shadow-[var(--shadow-glow)]" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Karibu Rafiki AI 👋</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Anza mazungumzo mapya kuuliza chochote kwa lugha yoyote.
        </p>
        <Button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="mt-6 gap-2"
          style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Anza mazungumzo mapya
        </Button>
      </div>
    </div>
  );
}
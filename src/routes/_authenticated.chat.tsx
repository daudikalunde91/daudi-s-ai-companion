import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/chat.functions";
import { ChatWindow } from "@/components/chat-window";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatIndex,
});

function ChatIndex() {
  return (
    <EmptyOrCreate />
  );
}

function EmptyOrCreate() {
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

  // Show a transient chat with no thread; first send creates one.
  // Simpler: auto-create on mount.
  useEffect(() => {
    if (!create.isPending && !create.isSuccess) create.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ChatWindow threadId="pending" initialMessages={[]} />;
}
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Check, Copy, Loader2, Mic, MicOff } from "lucide-react";
import { useVoiceSettings } from "@/lib/voice-settings";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Props = { threadId: string; initialMessages: UIMessage[] };

export function ChatWindow({ threadId, initialMessages }: Props) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          // Inject threadId into request body
          let body = init?.body;
          if (typeof body === "string") {
            try {
              const parsed = JSON.parse(body);
              parsed.threadId = threadId;
              body = JSON.stringify(parsed);
            } catch {
              /* noop */
            }
          }
          return fetch(input as RequestInfo, { ...init, headers, body });
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceSettings();
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const spokenRef = useRef<Set<string>>(new Set());

  // Auto-speak completed assistant messages
  useEffect(() => {
    if (!voice.autoSpeak) return;
    if (status === "submitted" || status === "streaming") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenRef.current.has(last.id)) return;
    const text = (last.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
    if (!text.trim()) return;
    spokenRef.current.add(last.id);
    voice.speak(text);
  }, [messages, status, voice]);

  useEffect(() => () => voice.stop(), [voice]);

  function startRecognition(continuous: boolean, onFinal?: (text: string) => void) {
    const SR: any =
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    if (!SR) {
      toast.error("Kifaa hiki hakitumii kuongea-kuwa-maandishi.");
      return null;
    }
    const rec = new SR();
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0].transcript;
        if (r.isFinal) {
          if (onFinal) onFinal(txt.trim());
          else setInput((prev) => (prev ? prev + " " : "") + txt.trim());
        }
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
    return rec;
  }

  function toggleMic() {
    if (listening && recRef.current) { recRef.current.stop(); return; }
    startRecognition(false);
  }

  useEffect(() => {
    taRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    voice.stop();
    setInput("");
    await sendMessage({ text });
    setTimeout(() => taRef.current?.focus(), 50);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <img src={logo} alt="" width={64} height={64} className="mx-auto rounded-2xl shadow-[var(--shadow-glow)]" />
              <h2 className="mt-4 text-2xl font-semibold">Mambo, rafiki! 👋</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Ask me anything in any language. I'm here to help with deep, friendly answers.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rafiki is thinking…
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              {error.message}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <form onSubmit={submit} className="max-w-3xl mx-auto px-4 py-4">
          <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Andika ujumbe wako… (type your message)"
              rows={1}
              className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 max-h-48 text-sm"
            />
            <Button
              type="button"
              size="icon"
              variant={listening ? "default" : "ghost"}
              onClick={toggleMic}
              className="rounded-xl shrink-0"
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              title={listening ? "Acha kurekodi" : "Ongea badala ya kuandika"}
            >
              {listening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="rounded-xl shrink-0"
              style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
              aria-label="Send"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Rafiki AI — Created by Mr Daudi Kalunde from Tanzania
          </p>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = (message.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 bg-primary text-primary-foreground text-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <img src={logo} alt="" className="rounded-lg shrink-0 mt-0.5 h-7 w-7 object-cover self-start" />
      <div className="flex-1 min-w-0 group">
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-pre:p-0 prose-pre:bg-transparent prose-code:text-foreground prose-hr:my-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children }) => <>{children}</>,
              code: ({ className, children, ...props }: any) => {
                const inline = !(className && /language-/.test(className));
                if (inline) {
                  return <code className={className} {...props}>{children}</code>;
                }
                const codeText = String(children).replace(/\n$/, "");
                const lang = (className || "").replace("language-", "");
                return <CodeBlock code={codeText} language={lang} />;
              },
            }}
          >{text || "…"}</ReactMarkdown>
        </div>
        {text && (
          <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton value={text} label="Nakili jibu" />
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ value, label = "Nakili" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs text-muted-foreground gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Imeshindikana kunakili");
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Imenakiliwa" : label}
    </Button>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="relative my-3 rounded-lg border border-border bg-muted overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{language || "code"}</span>
        <CopyButton value={code} label="Nakili" />
      </div>
      <pre className="p-3 overflow-x-auto text-xs"><code>{code}</code></pre>
    </div>
  );
}
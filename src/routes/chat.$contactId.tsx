import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Send, Sparkles, FileText, Heart, Brain, RefreshCcw } from "lucide-react";
import { useDB, store } from "@/lib/store";
import { ContactAvatar } from "@/components/ContactAvatar";
import { bubbleTime, dayHeading, fromNow, daysSince } from "@/lib/time";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { relationshipScore, trendLabel } from "@/lib/ai";
import { summarizeChatFn, generateReconnectFn, generateContactReplyFn } from "@/lib/api/ai.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$contactId")({
  component: ChatScreen,
});

function ChatScreen() {
  const { contactId } = Route.useParams();
  const navigate = useNavigate();
  const db = useDB();
  const contact = db.contacts.find((c) => c.id === contactId);
  const [draft, setDraft] = useState("");
  const [openSummary, setOpenSummary] = useState(false);
  const [openInsights, setOpenInsights] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = useMemo(
    () => db.messages
      .filter((m) => m.contact_id === contactId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [db.messages, contactId],
  );

  const memories = useMemo(
    () => db.memories.filter((m) => m.contact_id === contactId),
    [db.memories, contactId],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => () => {
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
  }, []);

  const grouped = useMemo(() => {
    const groups: { day: string; items: typeof messages }[] = [];
    for (const m of messages) {
      const day = dayHeading(m.timestamp);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(m);
      else groups.push({ day, items: [m] });
    }
    return groups;
  }, [messages]);

  if (!contact) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <p className="text-muted-foreground">Contact not found.</p>
          <Button asChild className="mt-3"><Link to="/">Back to chats</Link></Button>
        </div>
      </div>
    );
  }

  const c = contact;
  const stale = daysSince(c.last_contact_date) > 14;

  function send() {
    const text = draft.trim();
    if (!text || awaitingReply) return;
    store.addMessage(c.id, "user", text);
    setDraft("");
    setAwaitingReply(true);
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    const delay = 1200 + Math.random() * 800;
    replyTimerRef.current = setTimeout(async () => {
      try {
        const reply = await generateContactReplyFn({
          data: { contact: c, userText: text, messages },
        });
        store.addMessage(c.id, "contact", reply);
      } catch {
        toast.error("Couldn't generate a reply");
      } finally {
        setAwaitingReply(false);
      }
    }, delay);
  }

  async function sendReconnect() {
    try {
      const text = await generateReconnectFn({
        data: { contact: c, memories, daysSince: daysSince(c.last_contact_date) },
      });
      setDraft(text);
      toast.success("Reconnect message drafted");
    } catch {
      toast.error("Couldn't draft reconnect message");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-primary px-2 py-2 text-primary-foreground shadow-md">
        <button onClick={() => navigate({ to: "/" })} className="rounded-full p-2 hover:bg-white/10" aria-label="Back">
          <ArrowLeft className="size-5" />
        </button>
        <ContactAvatar name={contact.name} initials={contact.profile_picture} size="md" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-semibold">{contact.name}</div>
          <div className="truncate text-xs text-primary-foreground/75">{contact.relationship_type} · last seen {fromNow(contact.last_contact_date)}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full p-2 hover:bg-white/10" aria-label="More">
            <MoreVertical className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setOpenSummary(true)}>
              <FileText className="size-4" /> Chat Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpenInsights(true)}>
              <Brain className="size-4" /> Relationship Insights
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/assistant", search: { contact: contact.id } as never })}>
              <Sparkles className="size-4" /> Open Echo AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div ref={scrollRef} className="chat-backdrop flex-1 overflow-y-auto scrollbar-thin">
        {stale && (
          <div className="m-3 rounded-2xl border border-warning/30 bg-card p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-warning/15 text-warning">
                <RefreshCcw className="size-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">It's been {daysSince(contact.last_contact_date)} days</div>
                <p className="text-xs text-muted-foreground">Reconnect with an AI-drafted message that uses what you remember.</p>
              </div>
              <Button size="sm" onClick={sendReconnect}>Reconnect</Button>
            </div>
          </div>
        )}

        <div className="space-y-1 px-3 py-3">
          {grouped.map((g) => (
            <div key={g.day}>
              <div className="my-2 flex justify-center">
                <span className="rounded-full bg-card px-3 py-1 text-[11px] text-muted-foreground shadow-sm">{g.day}</span>
              </div>
              {g.items.map((m) => {
                const mine = m.sender === "user";
                return (
                  <div key={m.id} className={cn("mb-1 flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        mine
                          ? "rounded-br-md bg-[var(--color-bubble-out)] text-foreground"
                          : "rounded-bl-md bg-[var(--color-bubble-in)] text-foreground",
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-snug">{m.message_text}</p>
                      <div className="mt-0.5 text-right text-[10px] text-muted-foreground">{bubbleTime(m.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {awaitingReply && (
            <div className="mb-1 flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-[var(--color-bubble-in)] px-3 py-2 text-sm shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card p-2">
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-primary"
            onClick={() => navigate({ to: "/assistant", search: { contact: contact.id } as never })}
            aria-label="AI suggestions"
          >
            <Sparkles className="size-5" />
          </Button>
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message"
            className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <Button
            size="icon"
            className="rounded-full shadow"
            onClick={send}
            disabled={!draft.trim() || awaitingReply}
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>

      <ChatSummaryDialog open={openSummary} onOpenChange={setOpenSummary} contactId={contact.id} />
      <RelationshipInsightsDialog open={openInsights} onOpenChange={setOpenInsights} contactId={contact.id} />
    </div>
  );
}

function ChatSummaryDialog({ open, onOpenChange, contactId }: { open: boolean; onOpenChange: (v: boolean) => void; contactId: string }) {
  const db = useDB();
  const contact = db.contacts.find((c) => c.id === contactId)!;
  const messages = db.messages.filter((m) => m.contact_id === contactId);
  const memories = db.memories.filter((m) => m.contact_id === contactId);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["ai-summary", contactId, messages.length, memories.length],
    enabled: open,
    staleTime: 60_000,
    queryFn: () => summarizeChatFn({ data: { contact, messages, memories } }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="size-4 text-primary" /> Chat Summary</DialogTitle>
          <DialogDescription>Echo-generated overview of your conversation with {contact.name}.</DialogDescription>
        </DialogHeader>
        {isLoading || !summary ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Section title="Recent Topics" items={summary.recent_topics} fallback="No clear topics yet." />
            <Section title="Important Facts" items={summary.important_facts} fallback="Nothing critical surfaced." />
            <Section title="Open Commitments" items={summary.open_commitments} fallback="No open commitments." />
            <Section title="Suggested Follow-Ups" items={summary.suggested_followups} fallback="—" highlight />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, items, fallback, highlight }: { title: string; items: string[]; fallback: string; highlight?: boolean }) {
  return (
    <div className="mt-2">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{fallback}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={i}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                highlight ? "bg-primary/10 text-foreground" : "bg-muted text-foreground",
              )}
            >
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RelationshipInsightsDialog({ open, onOpenChange, contactId }: { open: boolean; onOpenChange: (v: boolean) => void; contactId: string }) {
  const db = useDB();
  const contact = db.contacts.find((c) => c.id === contactId)!;
  const messages = db.messages.filter((m) => m.contact_id === contactId);
  const memories = [...db.memories.filter((m) => m.contact_id === contactId)].sort((a, b) => b.importance_score - a.importance_score);
  const score = relationshipScore(messages, contact.last_contact_date);
  const trend = trendLabel(score);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Heart className="size-4 text-primary" /> Relationship Insights</DialogTitle>
          <DialogDescription>How your connection with {contact.name} is trending.</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Relationship score</div>
              <div className="text-3xl font-semibold">{score}<span className="text-base text-muted-foreground">/100</span></div>
            </div>
            <span className={cn("text-sm font-medium", trend.color)}>{trend.label}</span>
          </div>
          <Progress value={score} className="mt-3" />
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-muted p-2">
              <div className="text-muted-foreground">Last contact</div>
              <div className="font-medium text-foreground">{fromNow(contact.last_contact_date)}</div>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <div className="text-muted-foreground">Messages exchanged</div>
              <div className="font-medium text-foreground">{messages.length}</div>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Memory timeline</div>
          <ol className="relative space-y-3 border-l border-border pl-4">
            {memories.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground">{m.memory_text}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{m.importance_score}/10</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">{fromNow(m.created_at)}</div>
              </li>
            ))}
            {memories.length === 0 && <li className="text-sm text-muted-foreground">No memories yet.</li>}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}

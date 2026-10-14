import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Copy, RefreshCcw, Sparkles, Brain, Heart, MessageSquare, Send, AlertCircle } from "lucide-react";
import { useDB, store } from "@/lib/store";
import { ContactAvatar } from "@/components/ContactAvatar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { relationshipScore, trendLabel, type ReplySuggestion } from "@/lib/ai";
import { generateRepliesFn, generateReconnectFn } from "@/lib/api/ai.functions";
import { fromNow, daysSince } from "@/lib/time";
import { toast } from "sonner";

const search = z.object({ contact: z.string().optional() });

export const Route = createFileRoute("/assistant")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "AI Assistant — Echo" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  const db = useDB();
  const { contact: selectedFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string>(selectedFromSearch ?? db.contacts[0]?.id ?? "");

  useEffect(() => {
    if (selectedFromSearch && db.contacts.some((c) => c.id === selectedFromSearch)) {
      setSelectedId(selectedFromSearch);
    }
  }, [selectedFromSearch, db.contacts]);

  const contact = db.contacts.find((c) => c.id === selectedId);
  const messages = useMemo(
    () => db.messages
      .filter((m) => m.contact_id === selectedId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [db.messages, selectedId],
  );
  const memories = useMemo(
    () => [...db.memories.filter((m) => m.contact_id === selectedId)].sort((a, b) => b.importance_score - a.importance_score),
    [db.memories, selectedId],
  );

  const replyInput = useMemo(() => {
    if (!contact) return null;
    return {
      contact,
      messages: messages.slice(-20),
      memories: memories.slice(0, 5),
      style: db.style,
    };
  }, [contact, messages, memories, db.style]);

  const {
    data: replies = [],
    isLoading: repliesLoading,
    isFetching: repliesFetching,
    refetch: refetchReplies,
  } = useQuery({
    queryKey: ["ai-replies", selectedId, db.style, messages.length, memories.length],
    enabled: !!replyInput,
    staleTime: 60_000,
    queryFn: () => generateRepliesFn({ data: replyInput! }),
  });

  const staleDays = contact ? daysSince(contact.last_contact_date) : 0;
  const reconnectInput = useMemo(() => {
    if (!contact) return null;
    return { contact, memories: memories.slice(0, 5), daysSince: staleDays };
  }, [contact, memories, staleDays]);

  const { data: reconnectDraft = "", isLoading: reconnectLoading } = useQuery({
    queryKey: ["ai-reconnect", selectedId, staleDays, memories.length],
    enabled: !!reconnectInput && staleDays > 14,
    staleTime: 60_000,
    queryFn: () => generateReconnectFn({ data: reconnectInput! }),
  });

  const lastIncoming = [...messages].reverse().find((m) => m.sender === "contact");
  const score = contact ? relationshipScore(messages, contact.last_contact_date) : 0;
  const trend = trendLabel(score);
  const stale = staleDays > 14;

  async function copyReply(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy — try selecting the text manually");
    }
  }

  function sendReply(text: string) {
    if (!contact) return;
    store.addMessage(contact.id, "user", text);
    toast.success(`Sent to ${contact.name.split(" ")[0]}`);
    navigate({ to: "/chat/$contactId", params: { contactId: contact.id } });
  }

  function sendReconnect() {
    if (!contact || !reconnectDraft) return;
    store.addMessage(contact.id, "user", reconnectDraft);
    toast.success("Reconnect message sent");
    navigate({ to: "/chat/$contactId", params: { contactId: contact.id } });
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center gap-2 px-2 py-3">
          <Link to="/" className="rounded-full p-2 hover:bg-white/10" aria-label="Back">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="size-4" /> Echo Assistant
            </div>
            <p className="text-xs text-primary-foreground/75">Replies, memory and reconnects in one workspace</p>
          </div>
        </div>

        <div className="overflow-x-auto px-3 pb-3 scrollbar-thin">
          <div className="flex gap-2">
            {db.contacts.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-2 py-1 pr-3 text-sm transition",
                    active ? "bg-white text-primary shadow" : "bg-white/15 text-primary-foreground hover:bg-white/25",
                  )}
                >
                  <ContactAvatar name={c.name} initials={c.profile_picture} size="sm" />
                  <span className="font-medium">{c.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {!contact ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
          Select a contact to start.
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-6 scrollbar-thin">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <ContactAvatar name={contact.name} initials={contact.profile_picture} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-semibold">{contact.name}</h2>
                  <Badge variant="secondary" className="text-[10px]">{contact.relationship_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Last contact {fromNow(contact.last_contact_date)}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Heart className="size-3" /> Score
                </div>
                <div className="text-lg font-semibold leading-none">{score}</div>
                <div className={cn("text-[11px] font-medium", trend.color)}>{trend.label}</div>
              </div>
            </div>
            <Progress value={score} className="mt-3 h-1.5" />
          </section>

          {stale && (
            <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-9 place-items-center rounded-full bg-warning/20 text-warning">
                  <AlertCircle className="size-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Time to reconnect</div>
                  <p className="text-xs text-muted-foreground">
                    It's been {staleDays} days. Echo will draft a warm opener using what you remember.
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-border bg-card p-3 text-sm">
                {reconnectLoading ? <Skeleton className="h-12 w-full" /> : reconnectDraft}
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" disabled={!reconnectDraft} onClick={() => copyReply(reconnectDraft)}>
                  <Copy className="size-3.5" /> Copy
                </Button>
                <Button size="sm" disabled={!reconnectDraft} onClick={sendReconnect}>
                  <Send className="size-3.5" /> Send reconnect
                </Button>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="size-3.5" /> Latest from {contact.name.split(" ")[0]}
            </div>
            {lastIncoming ? (
              <blockquote className="rounded-xl bg-muted px-3 py-2 text-sm italic">
                "{lastIncoming.message_text}"
              </blockquote>
            ) : (
              <p className="text-sm text-muted-foreground">No incoming messages yet.</p>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Brain className="size-3.5" /> Memory used
              </div>
              <Link to="/chat/$contactId" params={{ contactId: contact.id }} className="text-xs font-medium text-primary">
                Open chat
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {memories.slice(0, 6).map((m) => (
                <div key={m.id} className="w-56 shrink-0 rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{m.importance_score}/10</Badge>
                    <span className="text-[10px] text-muted-foreground">{fromNow(m.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-snug">{m.memory_text}</p>
                </div>
              ))}
              {memories.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No memories captured yet.
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3.5" /> Suggested replies
              </div>
              <Button variant="ghost" size="sm" disabled={repliesFetching} onClick={() => refetchReplies()}>
                <RefreshCcw className={cn("size-3.5", repliesFetching && "animate-spin")} /> Regenerate
              </Button>
            </div>
            <div className="space-y-2">
              {repliesLoading || repliesFetching
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                      <Skeleton className="mb-2 h-5 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="mt-2 h-4 w-4/5" />
                    </div>
                  ))
                : replies.map((r) => <ReplyCard key={r.tone} reply={r} onCopy={copyReply} onSend={sendReply} />)}
            </div>
          </section>

          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            Powered by Echo AI — last 20 messages, top memories, and your style profile.
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

const toneStyles: Record<ReplySuggestion["tone"], string> = {
  Supportive: "bg-emerald-50 border-emerald-200 text-emerald-900",
  Friendly: "bg-sky-50 border-sky-200 text-sky-900",
  Humorous: "bg-amber-50 border-amber-200 text-amber-900",
  Professional: "bg-slate-50 border-slate-200 text-slate-900",
};

function ReplyCard({ reply, onCopy, onSend }: { reply: ReplySuggestion; onCopy: (t: string) => void; onSend: (t: string) => void }) {
  return (
    <div className={cn("rounded-2xl border p-3 shadow-sm", toneStyles[reply.tone])}>
      <div className="mb-1 flex items-center justify-between">
        <Badge className="bg-white/70 text-current hover:bg-white/70">{reply.tone}</Badge>
      </div>
      <p className="text-sm leading-snug">{reply.text}</p>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onCopy(reply.text)}>
          <Copy className="size-3.5" /> Copy
        </Button>
        <Button size="sm" onClick={() => onSend(reply.text)}>
          <Send className="size-3.5" /> Send
        </Button>
      </div>
    </div>
  );
}

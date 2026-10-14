import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Search, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useDB } from "@/lib/store";
import { ContactAvatar } from "@/components/ContactAvatar";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { relativeTime, daysSince } from "@/lib/time";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Echo — AI for the people who matter" },
      { name: "description", content: "An AI layer on top of your messages. Remember details, craft replies, never lose touch." },
      { property: "og:title", content: "Echo" },
      { property: "og:description", content: "AI-powered relationship memory and reply assistant." },
    ],
  }),
  component: ChatList,
});

function ChatList() {
  const db = useDB();
  const [q, setQ] = useState("");

  const lastByContact = useMemo(() => {
    const map = new Map<string, { text: string; at: string; sender: "user" | "contact" }>();
    for (const m of db.messages) {
      const cur = map.get(m.contact_id);
      if (!cur || new Date(m.timestamp) > new Date(cur.at)) {
        map.set(m.contact_id, { text: m.message_text, at: m.timestamp, sender: m.sender });
      }
    }
    return map;
  }, [db.messages]);

  const sorted = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...db.contacts]
      .filter((c) => {
        if (!query) return true;
        const last = lastByContact.get(c.id);
        return (
          c.name.toLowerCase().includes(query) ||
          c.relationship_type.toLowerCase().includes(query) ||
          (last?.text.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => {
        const aAt = lastByContact.get(a.id)?.at ?? a.last_contact_date;
        const bAt = lastByContact.get(b.id)?.at ?? b.last_contact_date;
        return new Date(bAt).getTime() - new Date(aAt).getTime();
      });
  }, [db.contacts, q, lastByContact]);

  const pendingReminders = db.reminders.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Echo</h1>
            <p className="text-xs text-primary-foreground/75">AI layer on top of your messages</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/reminders"
              className="relative rounded-full p-2 transition hover:bg-white/10"
              aria-label="Reminders"
            >
              <Bell className="size-5" />
              {pendingReminders > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold">
                  {pendingReminders}
                </span>
              )}
            </Link>
            <Link to="/settings" className="rounded-full p-2 transition hover:bg-white/10" aria-label="Settings">
              <SettingsIcon className="size-5" />
            </Link>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contacts"
              className="h-10 rounded-full border-0 bg-white pl-9 text-foreground placeholder:text-muted-foreground/70"
            />
          </div>
        </div>
      </header>

      <Link
        to="/assistant"
        className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-emerald-700 p-4 text-primary-foreground shadow-lg transition active:scale-[0.99]"
      >
        <div className="grid size-11 place-items-center rounded-xl bg-white/15">
          <Sparkles className="size-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Open Echo AI</div>
          <div className="text-xs text-primary-foreground/80">Replies, memories & reconnects in one place</div>
        </div>
      </Link>

      <ul className="flex-1 divide-y divide-border px-2 pt-2 pb-2">
        {sorted.map((c) => {
          const last = lastByContact.get(c.id);
          const stale = daysSince(c.last_contact_date) > 14;
          return (
            <li key={c.id}>
              <Link
                to="/chat/$contactId"
                params={{ contactId: c.id }}
                className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-muted"
              >
                <ContactAvatar name={c.name} initials={c.profile_picture} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-foreground">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(last?.at ?? c.last_contact_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-muted-foreground">
                      {last?.sender === "user" ? "You: " : ""}
                      {last?.text ?? "No messages yet"}
                    </p>
                    {stale ? (
                      <Badge variant="outline" className="shrink-0 border-warning/40 text-[10px] text-warning">
                        Reconnect
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {c.relationship_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="py-12 text-center text-sm text-muted-foreground">No contacts match "{q}".</li>
        )}
      </ul>

      <BottomNav />
    </div>
  );
}

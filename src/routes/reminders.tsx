import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { useDB, store } from "@/lib/store";
import { ContactAvatar } from "@/components/ContactAvatar";
import { BottomNav } from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast } from "date-fns";

export const Route = createFileRoute("/reminders")({
  head: () => ({ meta: [{ title: "Reminders — Echo" }] }),
  component: Reminders,
});

function Reminders() {
  const db = useDB();
  const today = db.reminders.filter((r) => r.status === "pending" && (isToday(new Date(r.due_date)) || isPast(new Date(r.due_date))));
  const upcoming = db.reminders.filter((r) => r.status === "pending" && !isToday(new Date(r.due_date)) && !isPast(new Date(r.due_date)));
  const completed = db.reminders.filter((r) => r.status === "completed");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center gap-2 px-2 py-3">
          <Link to="/" className="rounded-full p-2 hover:bg-white/10" aria-label="Back">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Bell className="size-4" /> Reminders
            </div>
            <p className="text-xs text-primary-foreground/75">Auto-detected from your conversations</p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <Group title="Today" items={today} contacts={db.contacts} />
        <Group title="Upcoming" items={upcoming} contacts={db.contacts} />
        <Group title="Completed" items={completed} contacts={db.contacts} />
      </div>

      <BottomNav />
    </div>
  );
}

function Group({ title, items, contacts }: { title: string; items: ReturnType<typeof useDB>["reminders"]; contacts: ReturnType<typeof useDB>["contacts"] }) {
  if (items.length === 0) {
    return (
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        <p className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
          Nothing here.
        </p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="space-y-2">
        {items.map((r) => {
          const c = contacts.find((x) => x.id === r.contact_id);
          const d = new Date(r.due_date);
          const due = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEE d MMM");
          const done = r.status === "completed";
          return (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => store.toggleReminder(r.id)}
                  className="mt-0.5 text-primary"
                  aria-label="Toggle complete"
                >
                  {done ? <CheckCircle2 className="size-5" /> : <Circle className="size-5 text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn("font-medium", done && "text-muted-foreground line-through")}>{r.title}</span>
                    <Badge variant="outline" className="text-[10px]">{due}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                  {c && (
                    <Link
                      to="/chat/$contactId"
                      params={{ contactId: c.id }}
                      className="mt-2 flex items-center gap-2 text-xs text-primary"
                    >
                      <ContactAvatar name={c.name} initials={c.profile_picture} size="sm" />
                      <span className="font-medium">{c.name}</span>
                    </Link>
                  )}
                  {r.reason && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
                      <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
                      <span>{r.reason}</span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

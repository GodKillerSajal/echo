import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, User } from "lucide-react";
import { useDB, store } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { UserStyleProfile } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Echo" }] }),
  component: Settings,
});

function Settings() {
  const db = useDB();
  const s = db.style;

  function setField<K extends keyof UserStyleProfile>(k: K, v: UserStyleProfile[K]) {
    store.updateStyle({ [k]: v } as Partial<UserStyleProfile>);
    toast.success("Style updated — replies will adapt");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center gap-2 px-2 py-3">
          <Link to="/" className="rounded-full p-2 hover:bg-white/10" aria-label="Back">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1">
            <div className="text-base font-semibold">Settings</div>
            <p className="text-xs text-primary-foreground/75">Your communication style powers every reply</p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground">
              <User className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Demo User</div>
              <div className="text-xs text-muted-foreground">demo@echo.app</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Your style profile</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The assistant matches your voice when generating replies.
          </p>

          <div className="mt-4 space-y-3">
            <Field label="Average message length">
              <Select value={s.average_message_length} onValueChange={(v) => setField("average_message_length", v as UserStyleProfile["average_message_length"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tone">
              <Select value={s.tone} onValueChange={(v) => setField("tone", v as UserStyleProfile["tone"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Emoji usage">
              <Select value={s.emoji_usage} onValueChange={(v) => setField("emoji_usage", v as UserStyleProfile["emoji_usage"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Coming soon</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {["WhatsApp integration", "Voice conversations", "Email", "Calendar", "Multi-agent flows", "Family graph"].map((f) => (
              <li key={f} className="rounded-lg bg-muted px-2 py-1.5 text-center text-muted-foreground">{f}</li>
            ))}
          </ul>
        </section>

        <section>
          <Button variant="outline" className="w-full" onClick={() => { store.reset(); toast.success("Demo data restored"); }}>
            <RotateCcw className="size-4" /> Reset demo data
          </Button>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

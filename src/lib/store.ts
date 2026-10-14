import { useSyncExternalStore } from "react";
import type { Contact, Memory, Message, Reminder, UserStyleProfile } from "./types";
import { seedContacts, seedMemories, seedMessages, seedReminders, seedStyleProfile } from "./seed";
import { extractMemories } from "./ai";

interface DB {
  contacts: Contact[];
  messages: Message[];
  memories: Memory[];
  reminders: Reminder[];
  style: UserStyleProfile;
}

const STORAGE_KEY = "echo.db.v1";
const LEGACY_STORAGE_KEY = "relcopilot.db.v1";

const seedDB = (): DB => ({
  contacts: seedContacts,
  messages: seedMessages,
  memories: seedMemories,
  reminders: seedReminders,
  style: seedStyleProfile,
});

function isDB(value: unknown): value is DB {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DB>;
  return (
    Array.isArray(v.contacts) &&
    Array.isArray(v.messages) &&
    Array.isArray(v.memories) &&
    Array.isArray(v.reminders) &&
    !!v.style &&
    typeof v.style === "object"
  );
}

function mergeExtractedMemories(contactId: string, messages: Message[], memories: Memory[]): Memory[] {
  const existing = new Set(
    memories.filter((m) => m.contact_id === contactId).map((m) => m.memory_text.toLowerCase()),
  );
  const extracted = extractMemories(messages.filter((m) => m.contact_id === contactId));
  const added = extracted
    .filter((m) => !existing.has(m.memory_text.toLowerCase()))
    .map((m) => ({
      ...m,
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      contact_id: contactId,
      created_at: new Date().toISOString(),
    }));
  return added.length ? [...memories, ...added] : memories;
}

function load(): DB {
  if (typeof window === "undefined") return seedDB();
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isDB(parsed)) return parsed;
    }
  } catch {}
  const fresh = seedDB();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

let db: DB = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
  listeners.forEach((l) => l());
}

export const store = {
  subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); },
  get(): DB { return db; },
  getServerSnapshot(): DB { return seedDB(); },
  reset() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    db = seedDB();
    persist();
  },

  addMessage(contactId: string, sender: "user" | "contact", text: string) {
    const msg: Message = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      contact_id: contactId, sender, message_text: text, timestamp: new Date().toISOString(),
    };
    const messages = [...db.messages, msg];
    db = {
      ...db,
      messages,
      contacts: db.contacts.map((c) => c.id === contactId ? { ...c, last_contact_date: msg.timestamp } : c),
      memories: mergeExtractedMemories(contactId, messages, db.memories),
    };
    persist();
  },

  toggleReminder(id: string) {
    db = {
      ...db,
      reminders: db.reminders.map((r) => r.id === id ? { ...r, status: r.status === "pending" ? "completed" : "pending" } : r),
    };
    persist();
  },

  addReminder(r: Omit<Reminder, "id">) {
    db = { ...db, reminders: [...db.reminders, { ...r, id: `r-${Date.now()}` }] };
    persist();
  },

  addMemory(m: Omit<Memory, "id" | "created_at">) {
    db = { ...db, memories: [...db.memories, { ...m, id: `mem-${Date.now()}`, created_at: new Date().toISOString() }] };
    persist();
  },

  updateStyle(patch: Partial<UserStyleProfile>) {
    db = { ...db, style: { ...db.style, ...patch } };
    persist();
  },
};

export function useDB(): DB {
  return useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
}

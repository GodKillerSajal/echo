import type { Contact, Memory, Message, UserStyleProfile } from "./types";

// Local fallback AI engine. Real replies go through src/lib/api/ai.functions.ts when GEMINI_API_KEY is set.

export interface ReplySuggestion {
  tone: "Supportive" | "Friendly" | "Humorous" | "Professional";
  text: string;
}

function styleSuffix(style: UserStyleProfile, tone: ReplySuggestion["tone"]) {
  if (tone === "Professional") return "";
  if (tone === "Humorous") return " 😂";
  return style.emoji_usage === "high" ? " ✨" : style.emoji_usage === "medium" ? " 🙂" : "";
}

export function generateReplies(opts: {
  contact: Contact;
  messages: Message[];
  memories: Memory[];
  style: UserStyleProfile;
}): ReplySuggestion[] {
  const { contact, messages, memories, style } = opts;
  const last = [...messages].reverse().find((m) => m.sender === "contact");
  const ctx = last?.message_text ?? "";
  const topMems = [...memories].sort((a, b) => b.importance_score - a.importance_score).slice(0, 3);
  const memHint = topMems[0]?.memory_text;
  const firstName = contact.name.split(" ")[0];

  const lower = ctx.toLowerCase();
  const isStressed = /stress|anxious|overwhelmed|tired|exhausted|nervous|worried/.test(lower);
  const isQuestion = /\?$/.test(ctx.trim());
  const isPositive = /great|amazing|good news|excited|congrats|happy/.test(lower);

  // Supportive
  const supportive = isStressed
    ? `You've got this, ${firstName}. ${memHint ? `I know ${memHint.toLowerCase()} has been on your mind — ` : ""}you've handled harder. I'm in your corner.`
    : memHint
      ? `Thinking of you. Also haven't forgotten — ${memHint.toLowerCase()}. Here whenever you need.`
      : `I hear you. Take it one thing at a time — I'm right here.`;

  // Friendly
  const friendly = isQuestion
    ? `Hey! ${ctx.length < 40 ? "Quick answer — " : ""}let me think... honestly, yeah, let's do it.`
    : isPositive
      ? `Yesss that's awesome ${firstName} 🙌 Tell me everything.`
      : `Aw appreciate you sending that. Want to hop on a quick call later?`;

  // Humorous
  const humorous = isStressed
    ? `Stress is temporary, legends are forever 😂 But seriously — coffee on me?`
    : isQuestion
      ? `Ah the eternal question. My official answer is: yes, maybe, depends on snacks.`
      : `Plot twist: I was about to message you the exact same thing. Get out of my head 😅`;

  // Professional
  const professional = isQuestion
    ? `Thanks for flagging — let me look into this and get back to you by end of day.`
    : `Appreciate the update. Happy to discuss next steps whenever you have a moment.`;

  return [
    { tone: "Supportive", text: supportive + (style.emoji_usage === "high" ? " ❤️" : "") },
    { tone: "Friendly", text: friendly + styleSuffix(style, "Friendly") },
    { tone: "Humorous", text: humorous },
    { tone: "Professional", text: professional },
  ];
}

export interface ChatSummary {
  recent_topics: string[];
  important_facts: string[];
  open_commitments: string[];
  suggested_followups: string[];
}

export function summarizeChat(opts: { contact: Contact; messages: Message[]; memories: Memory[] }): ChatSummary {
  const { contact, messages, memories } = opts;
  const first = contact.name.split(" ")[0];
  const recent = messages.slice(-30);

  const topics = new Set<string>();
  const facts = new Set<string>();
  const commits = new Set<string>();

  recent.forEach((m) => {
    const t = m.message_text.toLowerCase();
    if (/interview/.test(t)) topics.add("Upcoming interview");
    if (/launch|investor|startup/.test(t)) topics.add("Product launch & investors");
    if (/anniversary|dinner|date/.test(t)) topics.add("Anniversary plans");
    if (/japan|trip|vacation|lisbon/.test(t)) topics.add("Travel planning");
    if (/birthday/.test(t)) topics.add("Birthday celebration");
    if (/moved|bangalore|new place/.test(t)) topics.add("Recent move");
    if (/surgery|recovering|health|back/.test(t)) topics.add("Health & recovery");
    if (/book|murakami|reading/.test(t)) topics.add("Books & recommendations");
  });

  memories.forEach((m) => {
    if (m.importance_score >= 8) facts.add(m.memory_text);
    if (/saturday|monday|tuesday|wednesday|thursday|friday|sunday|tonight|tomorrow|weekend/i.test(m.memory_text)) {
      commits.add(m.memory_text);
    }
  });

  const followups = [
    `Ask ${first} how the ${[...topics][0]?.toLowerCase() ?? "week"} is going`,
    memories[0] ? `Reference: "${memories[0].memory_text}"` : `Send a quick check-in`,
    commits.size ? `Confirm: ${[...commits][0]}` : `Plan something low-key together`,
  ];

  return {
    recent_topics: [...topics].slice(0, 5),
    important_facts: [...facts].slice(0, 5),
    open_commitments: [...commits].slice(0, 5),
    suggested_followups: followups,
  };
}

export function generateReconnectMessage(contact: Contact, memories: Memory[]): string {
  const first = contact.name.split(" ")[0];
  const memory = [...memories].sort((a, b) => b.importance_score - a.importance_score)[0];
  if (!memory) {
    return `Hey ${first}! It's been a while — how have you been? Would love to catch up properly.`;
  }
  return `Hey ${first}! It's been a minute. I was just thinking about you — last we spoke, ${memory.memory_text.toLowerCase()}. How's everything going on that front?`;
}

export interface ExtractedMemory { memory_text: string; importance_score: number; }

export function extractMemories(messages: Message[]): ExtractedMemory[] {
  const out: ExtractedMemory[] = [];
  const seen = new Set<string>();
  const patterns: { re: RegExp; importance: number; transform: (m: RegExpMatchArray) => string }[] = [
    { re: /interview.*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|tomorrow)/i, importance: 10, transform: (m) => `Interview ${m[1]}` },
    { re: /moved to ([A-Z][a-z]+)/, importance: 9, transform: (m) => `Recently moved to ${m[1]}` },
    { re: /(anniversary|birthday).*(\d{1,2}(st|nd|rd|th)?)/i, importance: 10, transform: (m) => `${m[1]} on the ${m[2]}` },
    { re: /trip to ([A-Z][a-z]+)/, importance: 8, transform: (m) => `Planning trip to ${m[1]}` },
    { re: /(launch|investor call|product launch)/i, importance: 9, transform: (m) => `${m[1]} coming up` },
    { re: /(surgery|recovering)/i, importance: 9, transform: () => `Family member recovering from surgery` },
  ];
  for (const m of messages) {
    for (const p of patterns) {
      const match = m.message_text.match(p.re);
      if (match) {
        const text = p.transform(match);
        if (!seen.has(text)) { seen.add(text); out.push({ memory_text: text, importance_score: p.importance }); }
      }
    }
  }
  return out;
}

export function relationshipScore(messages: Message[], lastContactDate: string): number {
  const daysSince = (Date.now() - new Date(lastContactDate).getTime()) / 86400000;
  const total = messages.length;
  const ratio = total === 0 ? 0 : messages.filter((m) => m.sender === "user").length / total;
  const balance = 1 - Math.abs(0.5 - ratio) * 2; // 1 if balanced, 0 if one-sided
  const recency = Math.max(0, 1 - daysSince / 30);
  const volume = Math.min(1, total / 40);
  return Math.round((balance * 0.3 + recency * 0.5 + volume * 0.2) * 100);
}

export function trendLabel(score: number): { label: "Positive" | "Neutral" | "Needs Attention"; color: string } {
  if (score >= 70) return { label: "Positive", color: "text-success" };
  if (score >= 45) return { label: "Neutral", color: "text-warning" };
  return { label: "Needs Attention", color: "text-destructive" };
}

const contactAcks = [
  "Haha fair enough 😄",
  "Appreciate you!",
  "Makes sense — let me think on that.",
  "Yes! Let's do it.",
  "Sounds good to me.",
  "Thanks for checking in ❤️",
  "I'll get back to you on that soon.",
];

export function generateContactReply(userText: string): string {
  const lower = userText.toLowerCase();
  if (/\?$/.test(userText.trim())) return "Good question — let me get back to you on that shortly.";
  if (/thank|thanks|appreciate/.test(lower)) return "Of course! Anytime.";
  if (/love you|miss you/.test(lower)) return "Love you too ❤️";
  if (/sorry|apolog/.test(lower)) return "No worries at all — we're good.";
  if (/meet|call|coffee|dinner|weekend/.test(lower)) return "Yes, let's lock in a time. What works for you?";
  return contactAcks[Math.floor(Math.random() * contactAcks.length)];
}

import type { Contact, Memory, Message, UserStyleProfile } from "./types";
import type { ChatSummary, ReplySuggestion } from "./ai";

function buildContext(
  contact: Contact,
  messages: Message[],
  memories: Memory[],
  style: UserStyleProfile,
): string {
  const transcript = messages
    .slice(-20)
    .map((m) => `${m.sender === "user" ? "You" : contact.name}: ${m.message_text}`)
    .join("\n");

  const memoryBlock = memories
    .slice(0, 8)
    .map((m) => `- (${m.importance_score}/10) ${m.memory_text}`)
    .join("\n");

  return `
Contact: ${contact.name} (${contact.relationship_type})
Your communication style: ${style.tone} tone, ${style.average_message_length} messages, ${style.emoji_usage} emoji usage

Saved memories:
${memoryBlock || "(none yet)"}

Recent messages:
${transcript || "(no messages yet)"}
`.trim();
}

async function callGemini<T>(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature: 0.85,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini returned empty response");
  return JSON.parse(content) as T;
}

const REPLY_TONES = ["Supportive", "Friendly", "Humorous", "Professional"] as const;

export async function generateRepliesServer(
  input: { contact: Contact; messages: Message[]; memories: Memory[]; style: UserStyleProfile },
  apiKey: string,
  model: string,
): Promise<ReplySuggestion[]> {
  const context = buildContext(input.contact, input.messages, input.memories, input.style);
  const lastIncoming = [...input.messages].reverse().find((m) => m.sender === "contact");

  const result = await callGemini<{ replies: ReplySuggestion[] }>({
    apiKey,
    model,
    system: `You help the user draft SMS-style reply suggestions in Echo, a relationship messaging app.
Return JSON: { "replies": [{ "tone": "Supportive"|"Friendly"|"Humorous"|"Professional", "text": "..." }] }
Rules:
- Return exactly 4 replies, one per tone listed above
- Write as the user in first person — natural, sendable messages
- Reply to what ${input.contact.name} last said${lastIncoming ? `: "${lastIncoming.message_text}"` : ""}
- Weave in relevant memories when it feels natural
- Match the user's style profile (length, tone, emoji level)
- No markdown, no quotes around the message, no AI disclaimers`,
    user: context,
  });

  const replies = result.replies?.filter((r) => REPLY_TONES.includes(r.tone as (typeof REPLY_TONES)[number])) ?? [];
  if (replies.length < 4) throw new Error("Incomplete reply set from Gemini");
  return replies.slice(0, 4);
}

export async function summarizeChatServer(
  input: { contact: Contact; messages: Message[]; memories: Memory[] },
  apiKey: string,
  model: string,
): Promise<ChatSummary> {
  const context = buildContext(input.contact, input.messages, input.memories, {
    id: "style",
    average_message_length: "medium",
    tone: "casual",
    emoji_usage: "medium",
  });

  return callGemini<ChatSummary>({
    apiKey,
    model,
    system: `Summarize a conversation for the user in Echo.
Return JSON with these string array fields:
- recent_topics: up to 5 short topic labels
- important_facts: up to 5 key facts worth remembering
- open_commitments: up to 5 unresolved plans or promises
- suggested_followups: up to 3 concrete next messages the user could send
Be specific to the actual conversation. No generic filler.`,
    user: context,
  });
}

export async function generateReconnectServer(
  input: { contact: Contact; memories: Memory[]; daysSince: number },
  apiKey: string,
  model: string,
): Promise<string> {
  const memoryBlock = input.memories
    .slice(0, 5)
    .map((m) => `- ${m.memory_text}`)
    .join("\n");

  const result = await callGemini<{ text: string }>({
    apiKey,
    model,
    system: `Write one warm reconnect message from the user to ${input.contact.name}.
It's been ${input.daysSince} days since they last spoke.
Return JSON: { "text": "..." }
Rules: 1-3 sentences, human and personal, reference a memory if relevant, not salesy or formal unless relationship is Professional.`,
    user: `Relationship: ${input.contact.relationship_type}\nMemories:\n${memoryBlock || "(none)"}`,
  });

  if (!result.text?.trim()) throw new Error("Empty reconnect message from Gemini");
  return result.text.trim();
}

export async function generateContactReplyServer(
  input: { contact: Contact; userText: string; messages: Message[] },
  apiKey: string,
  model: string,
): Promise<string> {
  const recent = input.messages
    .slice(-8)
    .map((m) => `${m.sender === "user" ? "You" : input.contact.name}: ${m.message_text}`)
    .join("\n");

  const result = await callGemini<{ text: string }>({
    apiKey,
    model,
    system: `You are ${input.contact.name} replying in a text conversation (${input.contact.relationship_type}).
Return JSON: { "text": "..." }
Reply naturally to the user's latest message. 1-2 sentences. Match their texting style from the thread.`,
    user: `Recent thread:\n${recent}\n\nUser just sent: "${input.userText}"`,
  });

  if (!result.text?.trim()) throw new Error("Empty contact reply from Gemini");
  return result.text.trim();
}

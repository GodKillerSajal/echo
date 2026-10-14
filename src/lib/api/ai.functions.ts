import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerConfig } from "../config.server";
import {
  generateReplies,
  generateReconnectMessage,
  summarizeChat,
  generateContactReply,
} from "../ai";
import {
  generateRepliesServer,
  summarizeChatServer,
  generateReconnectServer,
  generateContactReplyServer,
} from "../ai.server";

const contactSchema = z.object({
  id: z.string(),
  name: z.string(),
  relationship_type: z.enum(["Friend", "Family", "Partner", "Professional"]),
  last_contact_date: z.string(),
  profile_picture: z.string(),
  created_at: z.string(),
  bio: z.string().optional(),
});

const messageSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  sender: z.enum(["user", "contact"]),
  message_text: z.string(),
  timestamp: z.string(),
});

const memorySchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  memory_text: z.string(),
  importance_score: z.number(),
  created_at: z.string(),
});

const styleSchema = z.object({
  id: z.string(),
  average_message_length: z.enum(["short", "medium", "long"]),
  tone: z.enum(["casual", "professional", "humorous"]),
  emoji_usage: z.enum(["low", "medium", "high"]),
});

async function withAI<T>(fn: (apiKey: string, model: string) => Promise<T>, fallback: () => T): Promise<T> {
  const { geminiApiKey, geminiModel } = getServerConfig();
  if (!geminiApiKey) return fallback();
  try {
    return await fn(geminiApiKey, geminiModel);
  } catch (err) {
    console.error("[Echo AI] Falling back to local engine:", err);
    return fallback();
  }
}

export const generateRepliesFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      contact: contactSchema,
      messages: z.array(messageSchema),
      memories: z.array(memorySchema),
      style: styleSchema,
    }),
  )
  .handler(async ({ data }) =>
    withAI(
      (apiKey, model) => generateRepliesServer(data, apiKey, model),
      () => generateReplies(data),
    ),
  );

export const summarizeChatFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      contact: contactSchema,
      messages: z.array(messageSchema),
      memories: z.array(memorySchema),
    }),
  )
  .handler(async ({ data }) =>
    withAI(
      (apiKey, model) => summarizeChatServer(data, apiKey, model),
      () => summarizeChat(data),
    ),
  );

export const generateReconnectFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      contact: contactSchema,
      memories: z.array(memorySchema),
      daysSince: z.number(),
    }),
  )
  .handler(async ({ data }) =>
    withAI(
      (apiKey, model) => generateReconnectServer(data, apiKey, model),
      () => generateReconnectMessage(data.contact, data.memories),
    ),
  );

export const generateContactReplyFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      contact: contactSchema,
      userText: z.string(),
      messages: z.array(messageSchema),
    }),
  )
  .handler(async ({ data }) =>
    withAI(
      (apiKey, model) => generateContactReplyServer(data, apiKey, model),
      () => generateContactReply(data.userText),
    ),
  );

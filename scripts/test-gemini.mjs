import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error("No .env file found. Create one with GEMINI_API_KEY=...");
    process.exit(1);
  }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

if (!apiKey || apiKey.includes("your-") || apiKey.includes("paste-")) {
  console.error("GEMINI_API_KEY is missing or still a placeholder in .env");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    systemInstruction: {
      parts: [{ text: 'Return JSON: { "replies": [{ "tone": "Friendly", "text": "hey!" }] }' }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: "Sarah said she's stressed about a Google interview. Draft one friendly reply." }],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      responseMimeType: "application/json",
    },
  }),
});

const body = await res.text();
if (!res.ok) {
  console.error("Gemini API failed:", res.status, body);
  process.exit(1);
}

const json = JSON.parse(body);
const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
console.log("Gemini API OK");
console.log("Model:", model);
console.log("Sample response:", text);

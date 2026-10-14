# ECHO — Relationship Copilot

ECHO is an early-stage prototype for keeping relationship context and follow-ups in one place. It brings together contact notes, conversation history, saved memories, reminders, and optional AI-assisted writing.

## What the prototype includes

- Contact cards with relationship type and last-contact date
- Sample conversation threads and saved context
- Reminders and communication-style preferences
- AI-assisted reply suggestions, conversation summaries, and reconnect prompts
- Local fallback responses when a Gemini API key is not configured

The app currently stores its demo data in browser `localStorage`. It does not include user accounts, external messaging integrations, or a production database. The included names and conversations are fictional sample data. This repository describes a prototype; it does not claim measured user or business outcomes.

## Built with

React, TypeScript, TanStack Start, Vite, Tailwind CSS, and an optional server-side Gemini API integration.

## Run locally

Requires a current Node.js release.

```bash
npm install
npm run dev
```

To enable Gemini-backed responses, copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Keep `.env` private; it is excluded by `.gitignore`. When Gemini is enabled, the conversation context needed for a requested assistant feature is sent to Google's Gemini API. Do not use real sensitive conversations in this demo.

## Project status

This is a functional prototype, not a production relationship-management service. Authentication, data export/backup, privacy controls, external chat syncing, and deployment hardening are not implemented. The checked-in Cloudflare and Netlify files are deployment scaffolding only; no public deployment has been verified.
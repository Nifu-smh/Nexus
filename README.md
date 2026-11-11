# NEXUS — Collaborative Engineering Workspace & Agile Management Platform

NEXUS is a next-generation engineering workspace and Agile project management platform featuring multi-tenant workspace isolation, real-time multiplayer telemetry, fluid drag-and-drop sprint boards, and instant cross-device synchronization.

---

## ✨ Core Capabilities

- **Interactive Workspace Selection:** Multi-tenant project directory with live sprint velocity telemetry and SLA monitoring.
- **Real-Time Multiplayer Sync:** 3-tier live collaboration powered by Supabase WebSockets Broadcast, Postgres CDC replication, and Presence tracking.
- **Fluid Kanban & Sprint Boards:** Drag-and-drop task boards, granular priority badges, assignees, and real-time status updates.
- **Spotlight Onboarding Walkthrough:** Guided first-time user tutorial with animated SVG cutout masking and keyboard navigation.
- **Clean Slate Architecture:** New users start with a clean workspace (zero dummy clutter) and optional sample sprint seeder.
- **Multi-Tenant Boundaries:** Workspace invite codes (`NX-XXXXXX`), member roles (`OWNER`, `MEMBER`), and isolated tenant scoping.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Plus Jakarta Sans, Inter, Material Symbols
- **State & Realtime Engine:** Supabase Realtime (WebSockets + Presence + Broadcast) & LocalStorage Dual Cache
- **Backend & Database:** Supabase PostgreSQL with Row Level Security (RLS) & RPC functions
- **Deployment:** Vercel

---

## 🚀 Environment Variables (for Vercel & Local)

Add these to your **Vercel Project Settings &rarr; Environment Variables**:

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase publishable/anon API key |

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run Vite local dev server (port 4444)
npm run dev

# Build for production
npm run build

# Type check
npm run lint
```

---

## 🗄️ Database Setup

Run [`supabase/schema.sql`](supabase/schema.sql) in your [Supabase SQL Editor](https://supabase.com/dashboard) to provision tables, triggers, RPC procedures, and Realtime publications.

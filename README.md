# FRANCHISE FORGE — THE STUDIO CHALLENGE

> **Build the Studio // Survive the Spotlight // Pitch the Franchise**  
> Complete zero-software-cost competition operating system web application built for college entertainment franchise challenges.

---

## 1. System Overview

**Franchise Forge: The Studio Challenge** is the competition operating system used during event days (AWS Workshop: October 5th–6th, 2026; Main Competition: October 7th, 2026).

It handles:
- **CSV Team Import**: Registration takes place externally. Organizers import participant CSVs, group 3–4 members per studio team, generate unique Team Codes (`FF26-001`) and cryptographically salted access codes.
- **Round 1 (Greenlight Forge)**: Teams submit franchise premise, genre, target audience, core conflict, world-building rules, and elevator pitches.
- **Round 2 (Character & Visual Forge)**: Teams build Hero and Villain profiles, relationship dynamics, visual prompts, and rendered artwork. Submissions pass through a mandatory 2-stage AI Safety Filter and a 100-Point AI Judging Rubric.
- **Round 3 (Marketing Forge)**: Teams create promotional strategy, taglines, teaser press release copy, and poster assets. *(Breaking News component has been completely removed)*.
- **Offline Final Pitch**: Top 5 teams present live offline before human judges. Human judges record scores directly into the studio system with **no online countdown timer**.

---

## 2. Architecture & Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS with custom Dark Studio Aesthetic.
- **Backend / Database**: Supabase PostgreSQL + local in-memory fallback.
- **Storage**: Amazon S3 (or presigned URLs / mock local fallback URLs).
- **AI Judging Service**: Modular `AIProvider` interface supporting local vision models via **Ollama** (`http://localhost:11434` running `llava` or `llama3.2-vision`) and zero-cost mock fallbacks.
- **Security**: Row Level Security (RLS), bcrypt access code hashing, HTTP-only JWT session cookies, team data isolation.

---

## 3. Environment Variables (`.env.local`)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Amazon S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=franchise-forge-submissions

# Modular AI Judge Service
AI_PROVIDER=ollama # 'ollama' or 'mock'
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_VISION_MODEL=llava

# Admin Security PIN
ADMIN_SECRET_PIN=studio2026admin
JWT_SECRET=franchise-forge-super-secret-jwt-key-2026
```

---

## 4. Local Quickstart

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Automated Test Suite
```bash
npm test
```

### Step 3: Launch Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. CSV Import Format

Organizers upload CSV exports from the registration system with these exact headers:
```csv
team_name,member_name,email,phone_number,semester,section
Studio Alpha,Rahul,rahul@email.com,9876543210,5,A
Studio Alpha,Priya,priya@email.com,9876543211,5,A
Studio Alpha,Arjun,arjun@email.com,9876543212,5,A
Studio Nova,Neha,neha@email.com,9876543220,3,B
Studio Nova,Aman,aman@email.com,9876543221,3,B
Studio Nova,Kiran,kiran@email.com,9876543222,3,B
Studio Nova,Dev,dev@email.com,9876543223,3,B
```

---

## 6. Local Ollama AI Setup

1. Install Ollama from [https://ollama.com](https://ollama.com)
2. Pull a vision-capable model:
   ```bash
   ollama pull llava
   ```
3. Start the Ollama local service:
   ```bash
   ollama serve
   ```
4. Set `AI_PROVIDER=ollama` in `.env.local`.

---

## 7. Supabase Database Migration Setup

Execute the SQL script located at [`supabase/migrations/20261001_initial_schema.sql`](file:///c:/Users/Komal/OneDrive/Desktop/Franchise_Forge/supabase/migrations/20261001_initial_schema.sql) in your Supabase SQL Editor to create all required tables (`teams`, `team_members`, `round1_submissions`, `round2_submissions`, `ai_evaluations`, `round3_submissions`, `final_scores`, `competition_settings`, `audit_logs`).

---

## 8. Summary of Created Files

| Module | File Location |
| :--- | :--- |
| **Database Migration** | `supabase/migrations/20261001_initial_schema.sql` |
| **Type Definitions** | `src/types/index.ts` |
| **Auth Engine** | `src/lib/auth.ts` |
| **CSV Importer** | `src/lib/csv-importer.ts` |
| **Modular AI Judge** | `src/lib/ai/index.ts`, `ollama-provider.ts`, `mock-provider.ts`, `types.ts` |
| **Data Service Layer**| `src/lib/db-service.ts` |
| **Audit Logger** | `src/lib/audit.ts` |
| **Storage Helper** | `src/lib/s3.ts` |
| **Public Pages** | `src/app/page.tsx`, `src/app/rules/page.tsx`, `src/app/event/page.tsx`, `src/app/login/page.tsx` |
| **Team Portal** | `src/app/dashboard/page.tsx`, `round1/page.tsx`, `round2/page.tsx`, `round3/page.tsx` |
| **Admin Control** | `src/app/admin/page.tsx`, `import/page.tsx`, `teams/page.tsx`, `ai-judge/page.tsx`, `final-pitch/page.tsx`, `audit-log/page.tsx` |
| **Automated Tests** | `tests/csv-import.test.ts`, `tests/ai-judge.test.ts` |
| **Demo Dataset** | `sample_teams.csv` |

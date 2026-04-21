# OptiLLM — Cost-Control Smart Model Router (Prototype)

OptiLLM is a working SaaS-style prototype that demonstrates **intelligent prompt routing** to reduce AI operational cost.

- **Simple** → Phi‑3 Mini (cheap)
- **Medium** → LLaMA 3 (balanced)
- **Complex** → GPT‑4o (advanced)

The dashboard shows:

- Prompt complexity + routing rationale
- Selected model + AI response
- Token usage + estimated cost
- Cost savings vs always using GPT‑4o

## Tech stack

- **Next.js** (App Router) + TypeScript + Tailwind
- **API routes** (Node.js runtime)
- **Postgres** + **Prisma**
- **Recharts** (analytics)
- **Framer Motion** (UI animation)

## Local setup (Windows / PowerShell)

### 1) Install dependencies

```bash
cd optillm
npm install
```

### 2) Start Postgres (Docker)

```bash
docker compose up -d
```

### 3) Configure env

- Copy `.env.example` → `.env` and set keys if you want real model calls.
- At minimum, `DATABASE_URL` must point to your Postgres instance.

### 4) Run Prisma migrations

```bash
npm run prisma:migrate
```

### 5) Start the dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Pages

- **`/`**: Landing page
- **`/dashboard`**: Prompt router UI
- **`/analytics`**: Admin analytics dashboard

## API routes

- **`POST /api/classify`**: returns complexity + reasons
- **`POST /api/router`**: classifies → routes → calls model → logs → returns response + cost + savings
- **`GET /api/analytics`**: aggregates usage + savings series

## AI providers

- **GPT‑4o**: set `OPENAI_API_KEY`
- **LLaMA 3 / Phi‑3**: optional OpenAI-compatible endpoints (`LLAMA3_BASE_URL`, `PHI3_BASE_URL`, etc.)
- If keys are not configured, the app returns a **mock response** (but still logs + charts work).


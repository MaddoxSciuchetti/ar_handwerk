# AR Handwerk — Voice-to-Task for Field Service

Turn a field technician's spoken site report into ready-to-send admin work.

A handyman records a short video on their AR glasses (or uploads a clip). The app
transcribes it, extracts the day's service tasks, and drafts the follow-up actions —
emails, calendar invites, supplier price lookups, and messaging updates — so the
office work is done by the time they leave the site.

Built for the Munich Hackathon.

## What it does

1. **Capture** — A technician records a job report on Meta Ray-Ban smart glasses,
   or uploads a video directly. Clips are stored in object storage.
2. **Transcribe** — The video is converted to a German transcript using a
   multimodal model (sees the footage and hears the audio).
3. **Extract** — A fine-tuned **Pioneer** model turns the transcript into
   structured service tasks: problem, location, deadline, people, materials, etc.
4. **Plan** — For each task, an LLM (via **fal**) drafts the follow-up sub-actions:
   - a professional email,
   - a calendar event,
   - a supplier price search,
   - demo integrations (WhatsApp, Telegram, supplier orders, …).
5. **Review & execute** — The user steps through each proposed action in a
   swipeable focus view and accepts, edits, skips, or rejects it. Accepted emails
   are sent via Gmail and events are created in Google Calendar.

## How the pipeline works

```text
Video  ──►  Transcript  ──►  Pioneer (extraction)  ──►  fal (action planning)  ──►  Review UI
          (Gemini /              (structured              (email / calendar /
           Whisper /              service tasks)           price / messaging
           custom)                                         drafts)
```

- **Real mode:** the uploaded video is transcribed live by the configured provider.
- **Demo mode** (`DEMO_VIDEO_MODE=true`): transcription is skipped and pre-written
  scripts are matched to the selected clips by filename, then fed through the same
  Pioneer → fal pipeline. This makes live demos deterministic and offline-friendly.

Each model has a graceful fallback: if no `FAL_API_KEY` is set, a rule-based planner
drafts the actions; if no transcription provider is set, a stub transcript is used.

## Tech stack

| Layer            | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org) (App Router, Route Handlers)     |
| Language         | [TypeScript](https://www.typescriptlang.org)                      |
| UI               | [React 19](https://react.dev), [Base UI](https://base-ui.com), [lucide-react](https://lucide.dev) icons |
| Styling          | [Tailwind CSS v4](https://tailwindcss.com)                        |
| Task extraction  | [Pioneer](https://pioneer.ai) fine-tuned model                    |
| Action planning  | [fal](https://fal.ai) (`fal-ai/any-llm`, defaults to Gemini Flash Lite) |
| Transcription    | [Gemini](https://ai.google.dev) (multimodal) / OpenAI Whisper / custom endpoint |
| Web search       | [Tavily](https://tavily.com) (supplier price lookups)             |
| Email & calendar | [Google APIs](https://github.com/googleapis/google-api-nodejs-client) (Gmail + Calendar via OAuth) |
| Database         | [Neon](https://neon.tech) serverless Postgres                     |
| File storage     | [Cloudflare R2](https://developers.cloudflare.com/r2/) (S3-compatible, AWS SDK v3) |
| Auth             | Cookie session (single demo user) + Google OAuth for integrations |

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in the values you need:

```bash
cp .env.example .env.local
```

The app is designed to run with sensible fallbacks, so you can start with very few
keys and add integrations incrementally. Key groups (see `.env.example` for the
full list and guidance):

| Group               | Variables                                                            | Needed for |
| ------------------- | -------------------------------------------------------------------- | ---------- |
| Demo auth           | `SESSION_SECRET`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`             | Logging in |
| Task extraction     | `PIONEER_API_KEY`, `PIONEER_MODEL_ID`                                | Extracting tasks |
| Action planning     | `FAL_API_KEY`, `FAL_MODEL`                                           | LLM-drafted actions (rule-based fallback otherwise) |
| Transcription       | `TRANSCRIPTION_PROVIDER`, `GEMINI_API_KEY` / `OPENAI_API_KEY`, …      | Live video transcription |
| Google integrations | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`     | Sending email & creating events |
| Web search          | `TAVILY_API_KEY`                                                     | Real supplier prices (placeholders otherwise) |
| Database            | `DATABASE_URL`                                                       | Persisting devices, videos, and tasks |
| File storage        | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Storing uploaded videos |
| Demo mode           | `DEMO_VIDEO_MODE`                                                    | Deterministic scripted demos |

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Start the local development server           |
| `npm run build`    | Create an optimized production build         |
| `npm run start`    | Run the production build locally             |
| `npm run lint`     | Lint the codebase with ESLint                |
| `npm run db:migrate` | Apply database migrations to Neon Postgres |

## Project structure

```text
.
├── public/                     # Static assets (device imagery, etc.)
├── scripts/
│   └── migrate-neon.mjs        # Neon Postgres migration runner
├── src/
│   ├── app/
│   │   ├── api/                # Route handlers (backend)
│   │   │   ├── analyze/        # Transcript → Pioneer extraction
│   │   │   ├── transcribe/     # Video → transcript
│   │   │   ├── devices/        # Device + video management (incl. demo pipeline)
│   │   │   ├── tasks/          # Task CRUD, action planning, execute actions
│   │   │   ├── integrations/   # Google OAuth connect/callback/status
│   │   │   ├── gmail/          # Mailbox read/send
│   │   │   └── demo/           # Demo-mode config
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/             # React UI (upload, device gallery, task & action flow)
│   └── lib/                    # Domain logic
│       ├── pioneer.ts          # Pioneer extraction client + schema
│       ├── transcribe.ts       # Transcription providers
│       ├── actions/            # Action planner (fal) + rule-based fallback
│       ├── demo/               # Scripted transcripts, matching, demo tasks
│       ├── google/ & gmail/    # OAuth, Gmail, Calendar
│       ├── r2/                 # Cloudflare R2 video storage
│       ├── tasks/              # Task model + repository
│       └── devices/            # Device + video catalog
├── next.config.ts
└── package.json
```

## Key flows in code

- **Video → transcript:** `src/lib/transcribe.ts`, `POST /api/transcribe`
- **Transcript → tasks:** `src/lib/pioneer.ts`, `POST /api/analyze`
- **Tasks → actions:** `src/lib/actions/planner.ts`, `POST /api/tasks/plan`
- **Demo pipeline:** `src/lib/demo/` (scripts in `transcripts.ts`, topics in `tasks.ts`)
- **Action review UI:** `src/components/action-flow.tsx`, `task-widget.tsx`, `tasks-view.tsx`

# Mestre IA — Web App

Next.js (App Router) web version of the Mestre IA mobile app. It mirrors every
feature of the React Native client (`../frontend`) — auth, guest mode, project
dashboard, PDF upload + live-streaming analysis, structured summary and the
streaming project chat — and adds a public **landing page** whose CTA drops a
visitor straight into the *project analyser* as a guest.

Same design system as the mobile app (deep-navy + technical-teal "blueprint"
aesthetic, Inter + JetBrains Mono), ported to Tailwind CSS v4.

## Stack

- Next.js 16 (App Router, React 19, TypeScript)
- Tailwind CSS v4 (design tokens in `src/app/globals.css`)
- `jsonrepair` for best-effort parsing of the partial summary JSON while it streams
- Native `fetch` ReadableStream for SSE (carries the `Authorization` header, which `EventSource` cannot)

## Running

```bash
cd webapp-frontend
cp .env.example .env.local      # point NEXT_PUBLIC_API_BASE_URL at your backend
npm install
npm run dev                     # http://localhost:3000
```

The backend (`../backend`) must be running and reachable at
`NEXT_PUBLIC_API_BASE_URL`. CORS already allows all origins.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (runs type-checking) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

## Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page (CTA → instant guest analyze)
│   ├── (auth)/login|signup   # Auth screens (redirect to /dashboard if signed in)
│   └── (app)/                # Authenticated shell (guard + nav)
│       ├── dashboard         # Projects list, hero CTA, stats
│       ├── upload            # Drag-and-drop PDF + guest quota gate
│       ├── summary           # Live-streaming structured summary
│       └── chat              # Streaming project chat
├── components/               # Design-system components (ported from mobile)
├── store/                    # AuthContext + AppContext
├── lib/api.ts                # REST client + SSE
├── types/api.ts              # Shared API types
└── theme/tokens.ts           # CSS-variable token references for inline styles
```

## Routes

| Route | Screen |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup` | Auth |
| `/dashboard` | Projects dashboard |
| `/upload` | Upload + analyse |
| `/summary` | Structured summary of the current project |
| `/chat` | Chat with the current project |

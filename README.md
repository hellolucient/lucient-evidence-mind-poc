# lucient-evidence-mind-poc

Minimal HTTPS API proof-of-concept for **Animoca Mind → Lucient Evidence Intelligence Engine (EIE)** integration.

This is **not** the full Evidence Intelligence Engine. It proves that an Animoca Mind can:

1. Call our HTTPS endpoint
2. Authenticate with an API key
3. Send a `workspace_id` and evidence query
4. Receive structured JSON
5. Turn that JSON into an Evidence Brief artifact

All evidence output is **static/dummy** for integration testing only, unless `filters.use_real_pubmed` is enabled (Phase 5 — see below).

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Health check |
| `POST` | `/api/query` | `Authorization: Bearer <API_KEY>` | Returns an Evidence Brief JSON (stubs or optional PubMed metadata) |

See [docs/magnesium-test.md](./docs/magnesium-test.md) for request/response schemas and curl examples.

### Phase 5: optional PubMed retrieval

When `filters.use_real_pubmed` is `true` and `filters.source_types` includes `"pubmed"`, the API calls NCBI E-utilities and maps results into the existing source object schema. Metadata only — no claim substantiation yet.

See [docs/pubmed-retrieval-test.md](./docs/pubmed-retrieval-test.md) for curl examples and fallback behavior.

Phase 7 tightens skeptical PubMed appraisal rules — see [docs/pubmed-appraisal-rules.md](./docs/pubmed-appraisal-rules.md).

## Setup

```bash
git clone https://github.com/hellolucient/lucient-evidence-mind-poc.git
cd lucient-evidence-mind-poc
npm install
cp .env.example .env.local
```

Edit `.env.local` and set your API key:

```bash
EIE_TOOL_API_KEY=your-secret-api-key-here
```

## Run locally

```bash
npm run dev
```

The API runs at [http://localhost:3000](http://localhost:3000).

### Quick test

Health check:

```bash
curl -s http://localhost:3000/api/health
```

Query (replace the API key with your value from `.env.local`):

```bash
curl -s -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key-here" \
  -d '{
    "workspace_id": "demo-magnesium",
    "query": "Magnesium for cortisol regulation",
    "mode": "evidence_brief",
    "filters": {
      "source_types": ["pubmed"],
      "recency_years": 10
    },
    "context": "Animoca Mind integration test. No real client data."
  }'
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start local dev server |
| `build` | `npm run build` | Production build |
| `start` | `npm run start` | Run production server locally |
| `lint` | `npm run lint` | ESLint via Next.js |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EIE_TOOL_API_KEY` | Yes (for `/api/query`) | Bearer token expected in the `Authorization` header |

If `EIE_TOOL_API_KEY` is missing at runtime, `/api/query` returns `500` with a safe error message. The key is never logged or exposed in responses.

## Deploy to Vercel

1. Push this repo to GitHub (if not already).
2. Import the project in [Vercel](https://vercel.com/new).
3. Set the environment variable:
   - **Name:** `EIE_TOOL_API_KEY`
   - **Value:** a strong secret (generate one for production)
4. Deploy. Vercel detects Next.js automatically.

After deploy, test:

```bash
curl -s https://YOUR-PROJECT.vercel.app/api/health
```

Use the same `POST /api/query` curl as above, replacing the host and API key.

## What this does not include

- Database, Supabase, auth provider, dashboard, RLS
- Full evidence search, PDF handling, full workspace system
- Background jobs, webhooks
- Full claim substantiation or final evidence grading (Phase 7 is conservative automated appraisal only)

## License

Private POC — Lucient.

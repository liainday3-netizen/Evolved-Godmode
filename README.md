# Evolved GodMode V2

Evolved GodMode is a pnpm monorepo containing the web application, API server, PostgreSQL/Drizzle data layer, and Expo mobile client.

## Workspace map

| Path | Purpose |
| --- | --- |
| `artifacts/godmode-web` | React web app: Home, AI Chat, Code Generator, Image Studio, Community, Trading Centre, Pricing and Privacy |
| `artifacts/api-server` | Express API, sessions, AI endpoints, conversations, community and image generation |
| `artifacts/godmode` | Expo / React Native mobile client |
| `lib/db` | Drizzle schema, PostgreSQL connection and schema tooling |
| `lib/api-zod` | Shared API validation types |
| `docs` | V2 architecture and feature notes |

## Requirements

- Node.js 24
- pnpm 10
- PostgreSQL
- An OpenAI-compatible API key for AI features

Install the locked dependencies:

```sh
pnpm install --frozen-lockfile
```

## Environment

Configure these values in your deployment platform's secret/environment settings. Do not commit real credentials or a populated `.env` file.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | For AI features | OpenAI-compatible API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Optional | Custom OpenAI-compatible API base URL |
| `SESSION_SECRET` | Production | Strong random secret for signed sessions |
| `CORS_ALLOWED_ORIGINS` | Production | Comma-separated, exact frontend origins allowed to call the API |
| `PORT` | Deployment-dependent | API server port |
| `EXPO_PUBLIC_DOMAIN` | Expo static build | Public hostname embedded in the Expo static deployment |

Use a real HTTPS hostname for `EXPO_PUBLIC_DOMAIN` in a real deployment. CI uses the reserved `.invalid` domain only to verify the build without embedding a production hostname.

Payment-provider credentials are deliberately not part of the V2 build verification. Configure payments only when that phase is approved. Never share API keys, session secrets, database passwords, or wallet recovery phrases in chat or source control.

## Database

The database schema is defined in `lib/db/src/schema/schema.ts`.

For a reviewed schema update, back up the target database first, then run:

```sh
pnpm --filter @workspace/db push
```

The coding-memory table is additive. Its SQL reference is `lib/db/migrations/0001_coding_memory.sql`; feature notes are in `docs/GODMODE_V2_CODING_MEMORY.md`.

Do not use `push-force` against a production database unless you have reviewed the proposed changes and have a recoverable backup.

## Development

Run the API and web client in separate terminals:

```sh
pnpm --filter @workspace/api-server dev
```

```sh
pnpm --filter @workspace/godmode-web dev
```

The API health endpoint is `/api/healthz`.

The Expo client has its own Replit-aware development command:

```sh
pnpm --filter @workspace/godmode dev
```

That command expects the Replit Expo environment variables used by the workspace script.

## Build and verification

Build and typecheck every workspace:

```sh
pnpm build
```

The root build performs the workspace TypeScript checks, API bundle, web production bundle, and Expo static iOS/Android bundles. The Expo static build requires `EXPO_PUBLIC_DOMAIN`.

GitHub Actions runs the same build on the `godmode-v2/build-foundation` branch. The CI run is a compile/build verification; it does not connect to a production database, call paid AI services, exercise payment checkout, or prove every live user flow.

## Mobile release note

The current Expo script generates static JavaScript bundles for iOS and Android. It does **not** sign or produce a store-ready IPA/APK. A standalone native release requires a native build service and the relevant Apple/Google signing and developer-account setup.

## Security and operating notes

- Session ownership is enforced by the server; browser-supplied user IDs are not treated as authentication.
- Keep production CORS origins explicit.
- Generated trading code is intended for paper-trading/testing, not guaranteed returns or unattended live trading.
- Coding memory is scoped to the server session and can be cleared from the Code Generator.
- Never put secrets in prompts, source files, screenshots, logs, or Git commits.

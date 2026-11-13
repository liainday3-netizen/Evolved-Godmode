# GodMode V2 coding memory

GodMode CodeGen now has the first native implementation of the CoSTEER-inspired learning loop.

## What it does

- Saves completed code-generation attempts against the server-issued session owner.
- Retrieves up to three recent, textually related attempts in the same language for the same owner.
- Prefers attempts marked successful and includes failure feedback as a cautionary signal.
- Lets the user mark an attempt successful or unsuccessful from the Code Generator.
- Redacts common API-token formats, private-key blocks, and common secret assignments before storing generated code.
- Provides a session-scoped deletion endpoint: `DELETE /api/codegen/memory`.

This is deliberately a lightweight lexical retrieval baseline. It does not require Python, RD-Agent, a vector database, an embedding API, or a paid service. A later iteration can add richer component relationships, error clustering, and optional embeddings without changing the privacy boundary.

## Database setup

The feature is additive. Apply `lib/db/migrations/0001_coding_memory.sql` to the target PostgreSQL database using the project's normal migration/backup procedure before expecting persistence and retrieval to work.

The API deliberately treats coding memory as optional: if the migration has not been applied, CodeGen still works, but retrieval and feedback persistence are unavailable and the server logs a warning.

**Do not run a destructive schema push.** Back up the database before applying the additive migration.

## Privacy boundary

- Records are scoped to `req.session.clientId`; browser-supplied user IDs are not accepted.
- Retrieval always filters by owner and language.
- Feedback updates and memory deletion are owner-scoped.
- Generated code is retained only after a completed response. Aborted generations are not stored.
- Credential redaction is best-effort, not a guarantee. Users should never submit secrets or private keys to an AI prompt.

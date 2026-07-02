# API Error Handling

Standard for how interface API routes report errors and how the client
consumes them. The goals: users always see a meaningful message (never a
silent empty state), the client can branch on stable codes instead of
matching message strings, and new error cases slot in without inventing new
shapes.

## The envelope

Every non-2xx JSON response from `/api/*` uses this shape:

```jsonc
{
	"error": "Unknown channel(s) for guild 477...: 123...", // short, log-friendly, may contain ids
	"code": "CHANNEL_NOT_FOUND", // stable, machine-readable, SCREAMING_SNAKE
	"userMessage": "This channel doesn't exist in this server.", // safe to render verbatim in the UI
	"details": { "unknownChannelIds": ["123..."] }, // optional structured context
	"retryAfter": 30 // optional, seconds (429/503 only)
}
```

Rules:

- `error` is for logs and developers. It may reference ids but must never
  leak secrets, tokens, or internal hostnames.
- `code` is the contract. Clients branch on `code` (or `status`), never on
  the text of `error`. Codes are never renamed once shipped; add new ones
  instead.
- `userMessage` is written for the end user: plain language, no ids, no
  jargon, actionable where possible ("Please try again", "Contact the
  server owner").
- `details` is optional and code-specific; document its shape next to the
  code below when you add one.

## Error codes

| Code                | Status | Meaning                                                        | `details`              |
| ------------------- | ------ | -------------------------------------------------------------- | ---------------------- |
| `UNAUTHORIZED`      | 401    | No/invalid session. Client signs the user out.                 | -                      |
| `FORBIDDEN`         | 403    | Authenticated but not allowed (not a member, not owner, ...).  | -                      |
| `NOT_FOUND`         | 404    | Generic resource missing.                                      | -                      |
| `GUILD_NOT_FOUND`   | 404    | Guild not in DB / bot removed.                                 | -                      |
| `CHANNEL_NOT_FOUND` | 404    | Channel id(s) don't exist in the requested guild.              | `{ unknownChannelIds }`|
| `CLIP_NOT_FOUND`    | 404    | Clip id doesn't exist or isn't visible to this user.           | -                      |
| `VALIDATION_ERROR`  | 400    | Zod/body/query validation failed.                              | zod `format()` output  |
| `RATE_LIMITED`      | 429    | Per-user rate limit hit.                                       | -                      |
| `PAYLOAD_TOO_LARGE` | 413    | Body over 1MB (middleware).                                    | -                      |
| `INVALID_ORIGIN`    | 403    | CSRF origin check failed (middleware).                         | -                      |
| `DB_UNAVAILABLE`    | 503    | Postgres unreachable (detected in `jsonError`).                | -                      |
| `REDIS_UNAVAILABLE` | 503    | Redis unreachable (detected in `jsonError`).                   | -                      |
| `QUEUE_UNAVAILABLE` | 503    | Job queue down (`queueUnavailableResponse`).                   | -                      |
| `UPSTREAM_ERROR`    | 502    | Discord API / bot-api call failed.                             | -                      |
| `INTERNAL_ERROR`    | 500    | Anything unexpected.                                           | -                      |

Adding a code: add it to `ApiErrorCode` in `interface/src/server/http.ts`,
add a row here, and pick the most specific existing code before inventing a
new one (`CHANNEL_NOT_FOUND` beats `NOT_FOUND` beats a bare 404).

## Server-side usage

Everything lives in `interface/src/server/http.ts`.

**Return an error directly:**

```ts
import { apiError } from "@/server/http";

return apiError(
	404,
	"CHANNEL_NOT_FOUND",
	`Unknown channel(s) for guild ${guildId}: ${bad.join(",")}`,
	"This channel doesn't exist in this server.",
	{ unknownChannelIds: bad }
);
```

**Throw from anywhere (services, helpers) and let the route's catch-all
translate it:**

```ts
import { ApiError, jsonError } from "@/server/http";

// deep inside a service:
throw new ApiError(404, "CLIP_NOT_FOUND", `Clip ${clipId} not found`,
	"This clip no longer exists.");

// route handler:
try {
	...
} catch (error) {
	console.error("Failed to X:", error);
	return jsonError(error); // ApiError -> its envelope; DB/Redis outages -> 503; else 500
}
```

`jsonError` also auto-detects infrastructure failures (Postgres connection
errors, Redis unavailability) and converts them to 503s with the right code,
so route handlers should funnel *all* caught errors through it rather than
hand-rolling a 500.

**Validation errors** keep using the existing pattern but should adopt the
envelope:

```ts
return apiError(400, "VALIDATION_ERROR", "Invalid query parameters",
	"Some filters were invalid. Try resetting your filters.",
	validation.error.format());
```

**Middleware** (`src/middleware.ts`) emits 401/403/413 before routes run;
those responses should carry `UNAUTHORIZED` / `INVALID_ORIGIN` /
`PAYLOAD_TOO_LARGE` codes when touched next.

## Client-side usage

`interface/src/lib/api/client.ts` throws `APIError` for any non-2xx
response. It exposes the envelope:

```ts
import { isAPIError } from "@/lib/api/client";

if (isAPIError(err)) {
	err.status; // 404
	err.code; // "CHANNEL_NOT_FOUND"
	err.userMessage; // safe to render
	err.details; // { unknownChannelIds: [...] }
}
```

Conventions:

- **Branch on `code`/`status`, render `userMessage`.** Fall back to a
  generic headline when `userMessage` is absent (unmigrated routes).
- **401** is handled globally in `apiRequest` (sign-out + redirect); don't
  handle it per-component.
- **React-query retry policy** (`providers/query-provider.tsx`): 4xx errors
  are never retried; transient/5xx errors retry once. Don't override
  per-query unless there's a reason.
- **Where to show errors:** full-screen/section overlay for primary page
  data (see `ErrorOverlay` in `ClipsPageContent.tsx`), toast via `sonner`
  for secondary data and mutations.

## Current state / migration

Migrated to the standard: `guilds/[guildId]/clips` (incl. the
`CHANNEL_NOT_FOUND` case), `scans/start`, `guilds/[guildId]/purge`,
`channels/[channelId]/purge` (the routes using `jsonError` /
`queueUnavailableResponse`).

The remaining ~30 routes return ad-hoc `{ error: "..." }` bodies with
correct-ish statuses (mostly 400/404/429/500). They are compatible with the
client fallback (no `code`/`userMessage` -> generic headline). Migrate them
opportunistically whenever a route is touched:

1. Replace `NextResponse.json({ error }, { status })` with `apiError(...)`
   (pick a code from the table).
2. Wrap the handler body's catch in `return jsonError(error)`.
3. Write a real `userMessage` for every case a user can actually hit.

Known gaps worth migrating first (user-visible today):

- `guilds/[guildId]/clips/[clipId]`: expired/unrefreshable CDN URL currently
  returns the stale URL silently; should surface `UPSTREAM_ERROR` context so
  the player can explain playback failure.
- `storage/[...path]`: 401s from `<img>`/poster fetches render as broken
  images; consider returning a placeholder image or documenting the
  MediaSession artwork caveat.
- `discord/me/guilds/refresh`: Discord rate limits bubble up as generic 500s
  in some paths; should be `RATE_LIMITED`/`UPSTREAM_ERROR` with retryAfter.

import "server-only";

const DEFAULT_BOT_API_TIMEOUT_MS = 2000;

export function getBotApiUrl(): string | null {
	const botApiUrl = process.env.BOT_API_URL?.trim();
	if (!botApiUrl) return null;
	return botApiUrl.replace(/\/+$/, "");
}

export function getBotApiTimeoutMs(): number {
	const rawTimeout = process.env.BOT_API_TIMEOUT_MS;
	if (!rawTimeout) return DEFAULT_BOT_API_TIMEOUT_MS;

	const timeoutMs = Number(rawTimeout);
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		return DEFAULT_BOT_API_TIMEOUT_MS;
	}

	return timeoutMs;
}

export async function fetchBotApi(
	path: string,
	init?: RequestInit
): Promise<Response> {
	const botApiUrl = getBotApiUrl();
	if (!botApiUrl) {
		throw new Error("BOT_API_URL is not configured");
	}

	const controller = new AbortController();
	const timeoutMs = getBotApiTimeoutMs();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	// Authenticate to the bot API with the shared internal token.
	// The bot API rejects requests without it (fail-closed).
	const internalToken = process.env.INTERNAL_API_TOKEN?.trim();
	const headers = new Headers(init?.headers);
	if (internalToken && !headers.has("X-Internal-Token")) {
		headers.set("X-Internal-Token", internalToken);
	}

	try {
		return await fetch(`${botApiUrl}${normalizedPath}`, {
			...init,
			headers,
			signal: init?.signal ?? controller.signal,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(`Bot API timed out after ${timeoutMs}ms`);
		}
		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

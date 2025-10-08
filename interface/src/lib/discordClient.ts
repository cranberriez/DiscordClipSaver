import "server-only";

// Minimal Discord client helpers

export async function discordFetch<T>(path: string, accessToken: string): Promise<T> {
	const base = "https://discord.com/api/v10";
	const res = await fetch(`${base}${path}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});

	if (!res.ok) {
		if (res.status === 429) {
			const retryAfter = res.headers.get("Retry-After") ?? undefined;
			const err: any = new Error("Rate limited by Discord");
			err.status = 429;
			err.retryAfter = retryAfter;
			throw err;
		}
		const err: any = new Error(`Discord API error (${res.status})`);
		err.status = res.status;
		throw err;
	}

	return (await res.json()) as T;
}

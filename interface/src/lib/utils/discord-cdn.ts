const DISCORD_CDN_EXPIRY_PARAM = "ex";

/** Extract the expiry encoded in a Discord signed CDN URL. */
export function getDiscordCdnExpiry(cdnUrl: string): Date | null {
	try {
		const encodedExpiry = new URL(cdnUrl).searchParams.get(
			DISCORD_CDN_EXPIRY_PARAM
		);
		if (!encodedExpiry || !/^[0-9a-f]+$/i.test(encodedExpiry)) {
			return null;
		}

		const expirySeconds = Number.parseInt(encodedExpiry, 16);
		const expiryMs = expirySeconds * 1000;
		if (
			!Number.isSafeInteger(expirySeconds) ||
			!Number.isFinite(expiryMs)
		) {
			return null;
		}

		const expiry = new Date(expiryMs);
		return Number.isNaN(expiry.getTime()) ? null : expiry;
	} catch {
		return null;
	}
}

/**
 * Prefer the expiry signed into the URL. The stored value can be stale or may
 * have been estimated by older versions of the refresh endpoint.
 */
export function getEffectiveCdnExpiry(
	cdnUrl: string,
	storedExpiry: string | Date
): Date | null {
	const urlExpiry = getDiscordCdnExpiry(cdnUrl);
	if (urlExpiry) return urlExpiry;

	const parsedStoredExpiry = new Date(storedExpiry);
	return Number.isNaN(parsedStoredExpiry.getTime())
		? null
		: parsedStoredExpiry;
}

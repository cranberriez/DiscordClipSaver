import "server-only";

export function getBoolParam(url: URL, name: string): boolean {
	const raw = url.searchParams.get(name);
	if (!raw) return false;
	const v = raw.toLowerCase();
	return v === "1" || v === "true";
}

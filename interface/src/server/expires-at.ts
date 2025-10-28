// Calculate the expiration time for a clip based on passed in attachment url
export function calculateExpiresAt(url: string): Date {
    const urlObj = new URL(url);
    const exParam = urlObj.searchParams.get("ex");
    if (exParam) {
        const seconds = Number.parseInt(exParam, 16);
        if (Number.isFinite(seconds)) {
            return new Date(seconds * 1000);
        }
    }
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

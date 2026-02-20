export function stripDiscordMentions(input: string): string {
	// Remove user mentions: <@123>, <@!123>
	let out = input.replace(/<@!?\d+>/g, "");
	// Remove role mentions: <@&123>
	out = out.replace(/<@&\d+>/g, "");
	// Remove channel mentions: <#\d+>
	out = out.replace(/<#\d+>/g, "");
	// Remove custom emojis: <:name:id> or <a:name:id>
	out = out.replace(/<a?:\w+:\d+>/g, "");
	// Collapse whitespace and trim
	out = out.replace(/\s+/g, " ").trim();
	return out;
}

export function messageTitleOrFilename(
	messageContent: string | undefined | null,
	fallbackFilename: string,
	titleOverride?: string | null
): string {
	if (titleOverride && titleOverride.trim().length > 0) {
		return titleOverride.trim();
	}
	if (messageContent && messageContent.trim().length > 0) {
		const cleaned = stripDiscordMentions(messageContent);
		if (cleaned.length > 0) return cleaned;
	}
	return fallbackFilename;
}

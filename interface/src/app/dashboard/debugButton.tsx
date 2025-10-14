"use client";
import type { FullGuild } from "@/lib/discord/types";

export default function DebugButton({ guild }: { guild: FullGuild }) {
	return (
		<button className="text-xs text-orange-200 cursor-pointer hover:underline underline-offset-2" onClick={() => console.log({ guild })}>Debug</button>
	);
}
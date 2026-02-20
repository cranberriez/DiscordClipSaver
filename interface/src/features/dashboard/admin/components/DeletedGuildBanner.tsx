"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";

interface DeletedGuildBannerProps {
	guildId: string;
	guildName: string;
	deletedAt: Date;
}

/**
 * Banner shown when a guild has been marked as deleted
 *
 * Shows:
 * - Alert that guild is deleted
 * - Bot has left or was removed
 * - Option to re-invite bot (links to install flow)
 */
export function DeletedGuildBanner({
	guildId,
	guildName,
	deletedAt,
}: DeletedGuildBannerProps) {
	const router = useRouter();
	const [isRedirecting, setIsRedirecting] = useState(false);

	// TODO: Implement re-invite logic
	const handleReInvite = () => {
		setIsRedirecting(true);
		// Redirect to bot invite flow with this guild pre-selected
		router.push(`/install?guild=${guildId}`);
	};

	return (
		<Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
			<CardHeader>
				<div className="flex items-center gap-2">
					<AlertTriangle className="h-5 w-5 text-yellow-500" />
					<CardTitle className="text-yellow-500">
						Guild Deleted
					</CardTitle>
				</div>
				<CardDescription>
					This guild was marked as deleted on{" "}
					{new Date(deletedAt).toLocaleString()}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">
					The bot has been removed from <strong>{guildName}</strong>.
					This can happen if the bot was kicked, the guild was purged,
					or you left the guild.
				</p>
				<p className="text-muted-foreground text-sm">
					To restore access, re-invite the bot to your guild. Your
					previous data may still be available if it wasn&apos;t
					purged.
				</p>
				<div className="flex gap-3">
					<Button
						onClick={handleReInvite}
						disabled={isRedirecting}
						variant="default"
						size="sm"
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${
								isRedirecting ? "animate-spin" : ""
							}`}
						/>
						Re-Invite Bot
					</Button>
					<BackButton text="Back to Dashboard" url="/dashboard" />
				</div>
			</CardContent>
		</Card>
	);
}

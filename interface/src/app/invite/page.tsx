"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/composite/navbar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

function InviteErrorContent() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");
	const guildId = searchParams.get("guildId");

	let title = "Invite Bot";
	let description = "You can invite the bot to a server from here.";

	if (error === "invites_disabled") {
		title = "Bot Invites Disabled";
		description = "Inviting the bot is currently disabled.";
	}

	if (error === "invites_restricted") {
		title = "Bot Invites Restricted";
		description = "Inviting the bot is restricted.";
	}

	const retryUrl = guildId
		? `/api/discord/bot/invite?guildId=${encodeURIComponent(guildId)}`
		: "/api/discord/bot/invite";

	return (
		<div className="flex h-full flex-col items-center justify-center pb-24">
			<Card className="bg-card/95 w-full max-w-md border-0 shadow-2xl backdrop-blur-sm">
				<CardHeader className="space-y-2 text-center">
					<CardTitle className="text-2xl font-bold tracking-tight">
						{title}
					</CardTitle>
					<CardDescription className="text-base">
						{description}
					</CardDescription>
				</CardHeader>
				<CardContent className="text-muted-foreground text-center text-sm">
					If you believe this is an error, contact an administrator.
				</CardContent>
				<CardFooter className="flex flex-col gap-3">
					<Button asChild size="lg" className="w-full text-base">
						<a href={retryUrl}>Try Again</a>
					</Button>
					<Button
						asChild
						variant="outline"
						size="lg"
						className="w-full"
					>
						<Link href="/dashboard">Back to Dashboard</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

export default function InvitePage() {
	return (
		<div className="flex h-screen flex-col">
			<Navbar />
			<PageContainer className="flex-1">
				<Suspense fallback={<div>Loading...</div>}>
					<InviteErrorContent />
				</Suspense>
			</PageContainer>
		</div>
	);
}

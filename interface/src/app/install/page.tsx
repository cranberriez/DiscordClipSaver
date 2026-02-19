"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { Navbar } from "@/components/composite/navbar";
import { Button } from "@/components/ui/button";
import { useGuild } from "@/lib/hooks";
import { Guild } from "@/lib/api/guild";
import { MoveRight } from "lucide-react";

const STATUS_MESSAGES = {
	ok: "Success",
	denied: "Denied",
	expired: "Expired",
	invalid: "Invalid",
	already_claimed: "Already Claimed",
};

function InstallContent() {
	const searchParams = useSearchParams();
	const guildId = searchParams.get("guild");
	const status = searchParams.get("status");
	const error = searchParams.get("error");
	const error_description = searchParams.get("error_description");

	const guild = useGuild(guildId ?? "");
	console.log(guild);

	console.log(searchParams);

	return (
		<div className="flex h-full flex-col items-center justify-center pb-24">
			<div className="flex flex-col items-center justify-center gap-24">
				<StatusDisplay status={status ?? ""} />
				<StatusMessage
					status={status ?? ""}
					error={error ?? null}
					error_description={error_description ?? null}
					guildName={guild.data?.name ?? ""}
				/>

				{guild.data && <WhatNext guild={guild.data} />}
			</div>
		</div>
	);
}

function StatusDisplay({ status }: { status: string }) {
	const STATUS_CLASSES = {
		ok: "bg-green-500/15 text-green-400 shadow-[0_0_80px_20px_rgba(34,197,94,0.35)]",
		denied: "bg-red-500/15 text-red-400 shadow-[0_0_80px_20px_rgba(239,68,68,0.35)]",
		expired:
			"bg-yellow-500/15 text-yellow-400 shadow-[0_0_80px_20px_rgba(234,179,8,0.35)]",
		invalid:
			"bg-red-500/15 text-red-400 shadow-[0_0_80px_20px_rgba(239,68,68,0.35)]",
		already_claimed:
			"bg-red-500/15 text-red-400 shadow-[0_0_80px_20px_rgba(239,68,68,0.35)]",
	};

	return (
		<div
			className={`flex w-64 items-center justify-center rounded-3xl px-4 py-6 text-xl font-semibold ${
				STATUS_CLASSES[status as keyof typeof STATUS_CLASSES]
			}`}
		>
			{STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES] ?? status}
		</div>
	);
}

function StatusMessage({
	status,
	error,
	error_description,
	guildName,
}: {
	status: string;
	error: string | null;
	error_description: string | null;
	guildName: string;
}) {
	const ERORR_MESSAGES = {
		access_denied: "Something went wrong, please try again.",
		already_claimed: "This guild has already been claimed!",
	};

	if (status === "ok") {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-center text-xl">
					You have successfully claimed {guildName}
				</p>
				<p className="text-muted-foreground text-center">
					The bot is now ready to start scanning and saving clips!
				</p>
			</div>
		);
	} else if (status === "already_claimed") {
		return (
			<p className="text-center text-xl">
				{ERORR_MESSAGES[status as keyof typeof ERORR_MESSAGES]}
			</p>
		);
	} else {
		return (
			<p className="text-center text-xl">
				{ERORR_MESSAGES[error as keyof typeof ERORR_MESSAGES]}
			</p>
		);
	}
}

function WhatNext({ guild }: { guild: Guild }) {
	return (
		<div className="bg-card/50 text-card-foreground relative w-full max-w-2xl overflow-hidden rounded-xl border shadow-sm">
			<div className="flex flex-col gap-6 p-8">
				<div className="space-y-2">
					<h2 className="text-2xl font-semibold tracking-tight">
						What Next?
					</h2>
					<p className="text-muted-foreground text-lg">
						Use the First Start setup to enable scanning, start your
						first scan, and see your clips in minutes.
					</p>
				</div>

				<div className="flex flex-col gap-4 pt-2 sm:flex-row">
					<Button
						asChild
						size="lg"
						className="w-full shadow-sm transition-all hover:shadow-md sm:w-auto"
					>
						<a
							href={`/setup/${guild.id}`}
							className="font-semibold"
						>
							Start Setup
							<MoveRight className="ml-2 h-4 w-4" />
						</a>
					</Button>
					<Button
						asChild
						variant="outline"
						size="lg"
						className="w-full sm:w-auto"
					>
						<a href={`/dashboard/${guild.id}`}>View Dashboard</a>
					</Button>
				</div>
			</div>
		</div>
	);
}

export default function InstallPage() {
	return (
		<div className="flex h-screen flex-col">
			<Navbar />
			<PageContainer className="flex-1">
				<Suspense fallback={<div>Loading...</div>}>
					<InstallContent />
				</Suspense>
			</PageContainer>
		</div>
	);
}

// SUCCESS
// URLSearchParams { guild → "1430727606436888668", status → "ok" }
// ​
// size: 2
// ​
// <entries>
// ​​
// 0: guild → "1430727606436888668"
// ​​
// 1: status → "ok"
// ​
// <prototype>: Object { … }
// page.tsx:18:13

// ALREADY CLAIMED
// URLSearchParams { guild → "1430727606436888668", status → "already_claimed" }
// ​
// size: 2
// ​
// <entries>
// ​
// <prototype>: Object { … }
// page.tsx:18:13

// CANCELLED / DENIED
// URLSearchParams(3) { status → "denied", error → "access_denied", error_description → "The resource owner or authorization server denied the request" }
// ​
// size: 3
// ​
// <entries>
// ​
// <prototype>: Object { … }
// page.tsx:18:13

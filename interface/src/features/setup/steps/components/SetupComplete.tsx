"use client";

import type { Guild } from "@/lib/api/guild";
import { useScanStatuses } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
	ExternalLink,
	Play,
	Settings,
	BarChart3,
	MessageSquare,
	Hash,
	CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function SetupComplete({ guild }: { guild: Guild }) {
	const { data: scanStatuses = [] } = useScanStatuses(guild.id);

	// Calculate statistics from scan data
	const totalMessagesScanned = scanStatuses.reduce(
		(sum, status) => sum + (status.message_count || 0),
		0
	);
	const channelsScanned = scanStatuses.filter(
		(s) => s.status === "SUCCEEDED"
	).length;
	const totalChannels = scanStatuses.length;
	const successRate =
		totalChannels > 0
			? Math.round((channelsScanned / totalChannels) * 100)
			: 0;

	return (
		<div className="animate-in fade-in slide-in-from-bottom-8 mt-8 space-y-12 py-8 duration-1000">
			{/* Success Message */}
			<div className="relative space-y-6 text-center">
				{/* Glow Effect */}
				<div className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/20 blur-[100px]" />

				<div className="relative mb-6 animate-bounce text-7xl duration-[2000ms]">
					🎉
				</div>

				<div className="relative z-10 space-y-2">
					<h3 className="bg-gradient-to-br from-white to-gray-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
						Your server is all set up!
					</h3>
					<p className="text-muted-foreground mx-auto max-w-lg text-lg">
						{guild.name} is now ready to automatically scan and
						organize your clips.
					</p>
				</div>
			</div>

			{/* Statistics */}
			<div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
				<StatsCard
					icon={<MessageSquare className="h-6 w-6 text-blue-500" />}
					value={totalMessagesScanned.toLocaleString()}
					label="Messages Scanned"
				/>
				<StatsCard
					icon={<Hash className="h-6 w-6 text-purple-500" />}
					value={channelsScanned.toString()}
					label="Channels Processed"
				/>
				<StatsCard
					icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
					value={`${successRate}%`}
					label="Success Rate"
				/>
			</div>

			{/* Action Buttons */}
			<div className="mx-auto max-w-md space-y-4">
				<Link href={`/clips?guild=${guild.id}`} className="block">
					<Button
						className="shadow-primary/20 hover:shadow-primary/40 h-12 w-full cursor-pointer text-lg font-semibold shadow-lg transition-all"
						size="lg"
					>
						<Play className="mr-2 h-5 w-5 fill-current" />
						View Clips
					</Button>
				</Link>

				<div className="grid grid-cols-2 gap-3">
					<Link href={`/dashboard/${guild.id}`}>
						<Button variant="outline" className="w-full">
							<Settings className="mr-2 h-4 w-4" />
							Dashboard
						</Button>
					</Link>
					<Link href={`/dashboard/${guild.id}/scans`}>
						<Button variant="outline" className="w-full">
							<BarChart3 className="mr-2 h-4 w-4" />
							Scans
						</Button>
					</Link>
				</div>
			</div>

			{/* Next Steps */}
			<div className="bg-card/50 mx-auto max-w-3xl rounded-xl border p-6 backdrop-blur-sm">
				<h4 className="mb-4 flex items-center gap-2 font-semibold">
					What&apos;s Next?
				</h4>
				<div className="text-muted-foreground grid gap-x-12 gap-y-4 text-sm sm:grid-cols-2">
					<div className="flex gap-3">
						<div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
						<span>
							<strong className="text-foreground mb-0.5 block">
								Automatic Scanning
							</strong>
							New messages will be automatically scanned for clips
							as they&apos;re posted
						</span>
					</div>

					<div className="flex gap-3">
						<div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
						<span>
							<strong className="text-foreground mb-0.5 block">
								Clip Organization
							</strong>
							Browse, search, and organize clips in the viewer
						</span>
					</div>

					<div className="flex gap-3">
						<div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
						<span>
							<strong className="text-foreground mb-0.5 block">
								Channel Management
							</strong>
							Configure which channels to scan in settings
						</span>
					</div>

					<div className="flex gap-3">
						<div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
						<span>
							<strong className="text-foreground mb-0.5 block">
								Regular Updates
							</strong>
							Run periodic scans to catch missed messages
						</span>
					</div>
				</div>
			</div>

			{/* Support Info */}
			<div className="text-muted-foreground text-center text-sm">
				Need help? Talk to us on our{" "}
				<Link
					href="#"
					className="text-primary font-medium hover:underline"
				>
					Discord Server
				</Link>
			</div>
		</div>
	);
}

function StatsCard({
	icon,
	value,
	label,
}: {
	icon: React.ReactNode;
	value: string;
	label: string;
}) {
	return (
		<Card className="border-muted hover:border-border bg-card/50 flex-row gap-4 p-4 backdrop-blur-sm transition-colors">
			<div className="flex gap-4">
				<div className="bg-background flex h-14 w-14 items-center justify-center rounded-full border p-2 shadow-sm">
					{icon}
				</div>
			</div>
			<div className="flex flex-col justify-center">
				<div className="text-2xl font-bold tracking-tight">{value}</div>
				<div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
					{label}
				</div>
			</div>
		</Card>
	);
}

"use client";

import {
	Shield,
	Link,
	Lock,
	UserCheck,
	Image,
	FileText,
	Server,
	ChevronLeft,
	Info,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const privacyPoints = [
	{
		icon: FileText,
		title: "Data we collect",
		description:
			"We only store data for messages with video attachments to display and manage clips. No transcripts or embeddings.",
		hasAction: true,
	},
	{
		icon: Link,
		title: "We don’t store video files",
		description:
			"We do not permanently store your videos. We store Discord CDN links. Video data is temporarily fetched for thumbnails.",
	},
	{
		icon: Image,
		title: "Thumbnails",
		description:
			"We generate a single small thumbnail frame for previews and store it on our server. You can disable this feature.",
	},
	{
		icon: Server,
		title: "Security",
		description:
			"Data is encrypted in transit (TLS). Stored on our Hetzner-hosted server with least-privilege access controls.",
	},
	{
		icon: Lock,
		title: "Permission mirroring",
		description:
			"Permissions are mirrored from Discord. If a user can’t view a channel, they can’t view its clips here. Cached and refreshed.",
	},
	{
		icon: UserCheck,
		title: "User control & Retention",
		description:
			"You can remove clips at any time (immediate deletion). Data is soft-deleted then wiped after 5 days. Backups retained 30 days.",
	},
];

export function DataPrivacySection() {
	const [showDetails, setShowDetails] = useState(false);

	return (
		<div className="space-y-16">
			<div className="mx-auto max-w-3xl space-y-4 text-center">
				<h2 className="text-3xl font-bold md:text-4xl">
					Transparent Data Usage
				</h2>
				<p className="text-muted-foreground text-lg">
					We believe in full transparency. Here is exactly how we
					handle your data, how we secure it, and what we store.
				</p>
			</div>

			<div className="relative mx-auto max-w-6xl">
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{privacyPoints.map((point, index) => (
						<div
							key={index}
							className="bg-card border-border/50 hover:border-primary/20 flex flex-col rounded-xl border p-6 transition-all duration-200"
						>
							<div className="mb-4 flex items-center gap-4">
								<div className="bg-primary/10 text-primary rounded-lg p-2.5">
									<point.icon className="h-6 w-6" />
								</div>
								<h3 className="text-lg leading-tight font-semibold">
									{point.title}
								</h3>
							</div>
							<div className="text-muted-foreground flex flex-1 flex-col justify-between gap-4 text-sm leading-relaxed">
								<p>{point.description}</p>
								{point.hasAction && (
									<button
										onClick={() => setShowDetails(true)}
										className="flex w-fit items-center gap-2 font-medium text-blue-500 transition-colors hover:text-blue-600 hover:underline"
									>
										<Info className="h-4 w-4" />
										View Details
									</button>
								)}
							</div>
						</div>
					))}
				</div>

				<AnimatePresence>
					{showDetails && (
						<motion.div
							key="details"
							initial={{
								opacity: 0,
								backdropFilter: "blur(0px)",
							}}
							animate={{
								opacity: 1,
								backdropFilter: "blur(12px)",
							}}
							exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
							className="bg-card/95 border-border/50 absolute inset-0 z-20 flex flex-col overflow-y-auto rounded-xl p-4 shadow-2xl md:p-8"
						>
							<button
								onClick={() => setShowDetails(false)}
								className="text-muted-foreground hover:text-foreground absolute top-4 left-4 flex items-center gap-1 text-sm font-medium transition-colors"
							>
								<ChevronLeft className="h-4 w-4" />
								Back
							</button>

							<div className="m-auto w-full max-w-4xl space-y-8 text-center">
								<div className="space-y-2">
									<div className="bg-primary/10 text-primary mx-auto w-fit rounded-lg p-3">
										<FileText className="h-6 w-6" />
									</div>
									<h3 className="text-2xl font-bold">
										Data We Collect
									</h3>
									<p className="text-muted-foreground mx-auto max-w-lg text-base">
										We scan channels we’re permitted to
										access to find video attachments. Only
										for those messages, we store:
									</p>
								</div>

								<div className="grid gap-8 text-left md:grid-cols-3">
									<div className="space-y-2">
										<span className="text-foreground font-semibold">
											IDs & Timestamps
										</span>
										<p className="text-muted-foreground text-sm leading-relaxed">
											Server, channel, and message IDs to
											verify authenticity and order clips
											chronologically.
										</p>
									</div>
									<div className="space-y-2">
										<span className="text-foreground font-semibold">
											Video Metadata
										</span>
										<p className="text-muted-foreground text-sm leading-relaxed">
											Filename, duration, file size, and
											the Discord CDN URL. We do not store
											the video file itself.
										</p>
									</div>
									<div className="space-y-2">
										<span className="text-foreground font-semibold">
											Content & Context
										</span>
										<p className="text-muted-foreground text-sm leading-relaxed">
											Caption text (used for search and
											clip titles) along with author
											display name, avatar, and channel
											name.
										</p>
									</div>
								</div>

								<div className="border-border/50 border-t pt-6">
									<p className="text-muted-foreground text-sm">
										<span className="text-foreground font-medium">
											What we don&apos;t collect:
										</span>{" "}
										Non-video messages, image attachments,
										transcripts, or embeddings.
									</p>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<div className="border-border bg-muted/30 rounded-xl border p-6 md:p-8">
				<div className="flex flex-col items-start gap-6 md:flex-row">
					<div className="shrink-0 rounded-full bg-blue-500/10 p-3 text-blue-500">
						<Shield className="h-8 w-8" />
					</div>
					<div className="flex-1 space-y-6">
						<div className="space-y-2">
							<h3 className="text-xl font-semibold">
								Authenticated via Discord
							</h3>
							<p className="text-muted-foreground">
								We use Discord OAuth for authentication and do
								not store passwords. The bot only reads channels
								it has been granted access to.
							</p>
							<p className="text-muted-foreground text-sm">
								To request access or deletion beyond in-product
								controls, contact:{" "}
								<a
									href="mailto:privacy@discordclipsaver.com"
									className="hover:text-primary transition-colors"
								>
									privacy@discordclipsaver.com
								</a>
							</p>
						</div>
						<div className="text-muted-foreground flex gap-2 text-sm font-medium">
							<a
								href="#"
								className="hover:text-primary transition-colors"
							>
								Privacy Policy
							</a>
							<span>•</span>
							<a
								href="#"
								className="hover:text-primary transition-colors"
							>
								Subprocessors
							</a>
							<span>•</span>
							<a
								href="#"
								className="hover:text-primary transition-colors"
							>
								Delete My Data
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

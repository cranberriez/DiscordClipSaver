"use client";

import {
	Shield,
	Link as LinkIcon,
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
import { SectionLayout } from "./SectionLayout";
import Link from "next/link";

const privacyPoints = [
	{
		icon: FileText,
		title: "Data we collect",
		description:
			"We only store data for messages with video attachments to display and manage clips. No transcripts or embeddings.",
		hasAction: true,
	},
	{
		icon: LinkIcon,
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
		<SectionLayout>
			<div className="flex flex-col items-center gap-12 md:gap-16">
				<div className="max-w-2xl space-y-5 px-4 text-center">
					<div className="space-y-3">
						<div className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">
							PRIVACY
						</div>
						<h2 className="text-3xl font-bold tracking-tight md:text-4xl md:leading-[1.15]">
							Transparent Data Usage
						</h2>
					</div>
					<p className="text-[16px] text-zinc-400">
						We believe in full transparency. Here is exactly how we
						handle your data, how we secure it, and what we store.
					</p>
				</div>

				<div className="w-full max-w-5xl space-y-12">
					<div className="relative mx-auto w-full">
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{privacyPoints.map((point, index) => (
								<div
									key={index}
									className="flex flex-col rounded-[1.25rem] border border-white/[0.04] bg-[#0c0c10] p-6 transition-colors hover:bg-[#121218]"
								>
									<div className="mb-4 flex items-center gap-4">
										<div className="rounded-lg bg-white/[0.02] p-2.5">
											<point.icon className="h-5 w-5 text-indigo-400" />
										</div>
										<h3 className="text-[15px] leading-tight font-semibold text-zinc-100">
											{point.title}
										</h3>
									</div>
									<div className="flex flex-1 flex-col justify-between gap-4 text-[14px] leading-relaxed text-zinc-400">
										<p>{point.description}</p>
										{point.hasAction && (
											<button
												onClick={() =>
													setShowDetails(true)
												}
												className="flex w-fit items-center gap-2 font-medium text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
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
									exit={{
										opacity: 0,
										backdropFilter: "blur(0px)",
									}}
									transition={{
										duration: 0.3,
										ease: "easeInOut",
									}}
									className="absolute inset-0 z-20 flex flex-col overflow-y-auto rounded-[1.25rem] border border-white/[0.04] bg-[#0d0d12]/95 p-4 shadow-2xl md:p-8"
								>
									<button
										onClick={() => setShowDetails(false)}
										className="absolute top-4 left-4 flex items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
									>
										<ChevronLeft className="h-4 w-4" />
										Back
									</button>

									<div className="m-auto w-full max-w-4xl space-y-8 text-center">
										<div className="space-y-2">
											<div className="mx-auto w-fit rounded-lg bg-white/[0.02] p-3">
												<FileText className="h-6 w-6 text-indigo-400" />
											</div>
											<h3 className="text-2xl font-bold text-white">
												Data We Collect
											</h3>
											<p className="mx-auto max-w-lg text-base text-zinc-400">
												We scan channels we’re permitted
												to access to find video
												attachments. Only for those
												messages, we store:
											</p>
										</div>

										<div className="grid gap-8 text-left md:grid-cols-3">
											<div className="space-y-2">
												<span className="font-semibold text-zinc-100">
													IDs & Timestamps
												</span>
												<p className="text-sm leading-relaxed text-zinc-400">
													Server, channel, and message
													IDs to verify authenticity
													and order clips
													chronologically.
												</p>
											</div>
											<div className="space-y-2">
												<span className="font-semibold text-zinc-100">
													Video Metadata
												</span>
												<p className="text-sm leading-relaxed text-zinc-400">
													Filename, duration, file
													size, and the Discord CDN
													URL. We do not store the
													video file itself.
												</p>
											</div>
											<div className="space-y-2">
												<span className="font-semibold text-zinc-100">
													Content & Context
												</span>
												<p className="text-sm leading-relaxed text-zinc-400">
													Caption text (used for
													search and clip titles)
													along with author display
													name, avatar, and channel
													name.
												</p>
											</div>
										</div>

										<div className="border-t border-white/[0.04] pt-6">
											<p className="text-sm text-zinc-400">
												<span className="font-medium text-zinc-100">
													What we don&apos;t collect:
												</span>{" "}
												Non-video messages, image
												attachments, transcripts, or
												embeddings.
											</p>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					<div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c0c10] p-6 md:p-8">
						<div className="flex flex-col items-start gap-6 md:flex-row">
							<div className="shrink-0 rounded-full bg-white/[0.02] p-3 text-indigo-400">
								<Shield className="h-8 w-8" />
							</div>
							<div className="flex-1 space-y-6 text-left">
								<div className="space-y-2">
									<h3 className="text-xl font-semibold text-zinc-100">
										Authenticated via Discord
									</h3>
									<p className="text-[15px] leading-relaxed text-zinc-400">
										We use Discord OAuth for authentication
										and do not store passwords. The bot only
										reads channels it has been granted
										access to.
									</p>
									<p className="text-sm text-zinc-500">
										To request access or deletion beyond
										in-product controls, contact:{" "}
										<a
											href="mailto:privacy@discordclipsaver.com"
											className="text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
										>
											privacy@discordclipsaver.com
										</a>
									</p>
								</div>
								<div className="flex gap-2 text-sm font-medium text-zinc-500">
									<Link
										href="/privacy"
										className="transition-colors hover:text-zinc-300"
									>
										Privacy Policy
									</Link>
									<span>•</span>
									<Link
										href="/subprocessors"
										className="transition-colors hover:text-zinc-300"
									>
										Subprocessors
									</Link>
									<span>•</span>
									<Link
										href="/me/settings"
										className="transition-colors hover:text-zinc-300"
									>
										Delete My Data
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</SectionLayout>
	);
}

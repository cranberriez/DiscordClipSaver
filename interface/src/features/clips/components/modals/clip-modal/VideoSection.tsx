"use client";

import { VideoPlayer } from "../../VideoPlayer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface VideoSectionProps {
	isRefreshing: boolean;
	hasPlaybackError: boolean;
	videoUrl: string;
	posterUrl?: string | null;
	clipTitle: string;
	clipId: string;
	onError: () => void;
	onPlayerReady: (player: any) => void;
}

export function VideoSection({
	isRefreshing,
	hasPlaybackError,
	videoUrl,
	posterUrl,
	clipTitle,
	onError,
	onPlayerReady,
}: VideoSectionProps) {
	return (
		<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-4 md:px-4 md:py-6">
			<div className="flex h-full max-h-full w-full max-w-[98vw] items-center justify-center 2xl:max-w-none">
				{isRefreshing ? (
					<div className="flex aspect-video h-full max-h-full w-full flex-col items-center justify-center gap-4 rounded-lg border border-white/5 bg-gradient-to-br from-neutral-900/50 to-neutral-800/50 shadow-xl backdrop-blur-sm">
						<div className="animate-in fade-in flex flex-col items-center gap-3 duration-300">
							<Loader2 className="text-primary/80 h-8 w-8 animate-spin" />
							<div className="space-y-1 text-center">
								<p className="text-foreground/90 text-lg font-medium">
									Refreshing Stream
								</p>
								<p className="text-muted-foreground text-sm">
									Getting a fresh link from Discord...
								</p>
							</div>
						</div>
					</div>
				) : hasPlaybackError ? (
					<div className="bg-muted flex aspect-video flex-col items-center justify-center gap-4 rounded-lg">
						<p className="text-muted-foreground px-4 text-center">
							Video cannot be played
						</p>
						<p className="text-muted-foreground px-4 text-center text-sm">
							This may be due to an expired CDN URL, unsupported
							video codec (HEVC/H.265) for your browser, or the
							clip was deleted from Discord.
						</p>
						<Button
							onClick={() => window.open(videoUrl, "_blank")}
							variant="default"
						>
							Download Video
						</Button>
					</div>
				) : (
					<VideoPlayer
						src={videoUrl}
						poster={posterUrl || undefined}
						title={clipTitle}
						onError={onError}
						onPlayerReady={onPlayerReady}
					/>
				)}
			</div>
		</div>
	);
}

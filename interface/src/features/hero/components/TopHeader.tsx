import { Bot, ChevronRight, Hash, Search } from "lucide-react";
import { SectionLayout } from "./SectionLayout";

export function TopHeader() {
	return (
		<SectionLayout>
			<div className="relative space-y-12 text-center">
				<div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[300px] w-[600px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />
				<div className="space-y-4">
					<h2 className="text-4xl font-bold tracking-tight md:text-5xl">
						A searchable clip library for your Discord server
					</h2>
					<div className="space-y-3">
						<p className="text-muted-foreground mx-auto max-w-2xl text-[17px] leading-relaxed">
							Guild Moments uses a bot to automatically collect
							clips posted in your server and makes them
							searchable by game, channel, author, and date.
						</p>
					</div>
				</div>

				<div className="flex flex-col items-center justify-center gap-4 text-sm font-medium text-zinc-400 md:flex-row">
					<div className="flex w-full max-w-[260px] items-center justify-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 transition-colors hover:bg-white/[0.04] md:w-auto md:max-w-none">
						<Bot className="h-5 w-5" />
						Add the bot
					</div>
					<ChevronRight className="h-5 w-5 rotate-90 text-zinc-700 md:rotate-0" />
					<div className="flex w-full max-w-[260px] items-center justify-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 transition-colors hover:bg-white/[0.04] md:w-auto md:max-w-none">
						<Hash className="h-5 w-5" />
						Choose channels
					</div>
					<ChevronRight className="h-5 w-5 rotate-90 text-zinc-700 md:rotate-0" />
					<div className="flex w-full max-w-[260px] items-center justify-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 transition-colors hover:bg-white/[0.04] md:w-auto md:max-w-none">
						<Search className="h-5 w-5" />
						Search & share
					</div>
				</div>
			</div>
		</SectionLayout>
	);
}

import { Search, Server, Zap, Heart, Filter, Infinity } from "lucide-react";
import { SectionLayout } from "./SectionLayout";

const features = [
	{
		icon: Search,
		title: "Smart Search",
		description:
			"Search by game, channel, author, or time—find any clip fast.",
		color: "text-blue-400",
	},
	{
		icon: Server,
		title: "Multi-Server",
		description: "Manage clips across multiple servers in one dashboard.",
		color: "text-emerald-400",
	},
	{
		icon: Zap,
		title: "Auto-Capture",
		description: "Automatically index clips posted in selected channels.",
		color: "text-amber-400",
	},
	{
		icon: Heart,
		title: "Favorites",
		description:
			"Save favorites and build collections for recaps and events.",
		color: "text-rose-400",
	},
	{
		icon: Filter,
		title: "Advanced Filters",
		description: "Filter by channel, date range, tags, and more.",
		color: "text-purple-400",
	},
	{
		icon: Infinity,
		title: "Fluid Browsing",
		description:
			"Browse your entire library with smooth infinite scrolling.",
		color: "text-cyan-400",
	},
];

export function FeatureGrid() {
	return (
		<SectionLayout>
			<div className="space-y-12">
				<div className="space-y-4 text-center">
					<div className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">
						FEATURES
					</div>
					<h2 className="text-3xl font-bold tracking-tight md:text-4xl">
						Built to manage clips at scale
					</h2>
					<p className="text-muted-foreground mx-auto max-w-2xl text-[17px]">
						Powerful tools that keep your server&apos;s best moments
						organized.
					</p>
				</div>

				<div className="mx-auto grid gap-4 md:grid-cols-2">
					{features.map((feature, index) => (
						<div
							key={index}
							className="flex items-start gap-5 rounded-[1.25rem] border border-white/[0.04] bg-[#0c0c10] p-6 transition-colors hover:bg-[#121218]"
						>
							<feature.icon
								className={`mt-0.5 h-[1.35rem] w-[1.35rem] shrink-0 ${feature.color}`}
							/>
							<div className="space-y-1">
								<h3 className="text-[15px] font-semibold text-zinc-100">
									{feature.title}
								</h3>
								<p className="text-[14px] leading-relaxed text-zinc-400">
									{feature.description}
								</p>
							</div>
						</div>
					))}
				</div>

				<div className="text-center text-xs text-zinc-600">
					Works with Discord servers via a bot integration · Not
					affiliated with or endorsed by Discord
				</div>
			</div>
		</SectionLayout>
	);
}

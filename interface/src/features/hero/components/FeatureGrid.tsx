import { Search, Server, Zap, Heart, Filter, Infinity } from "lucide-react";

const features = [
	{
		icon: Search,
		title: "Smart Search",
		description:
			"Search by title, game, author, or time. Find any clip in seconds.",
		color: "bg-blue-500/10 text-blue-500",
	},
	{
		icon: Server,
		title: "Multi-Server",
		description:
			"Manage clips across all your Discord servers in one place.",
		color: "bg-green-500/10 text-green-500",
	},
	{
		icon: Zap,
		title: "Auto-Capture",
		description:
			"Automatically save clips posted in your Discord channels.",
		color: "bg-yellow-500/10 text-yellow-500",
	},
	{
		icon: Heart,
		title: "Favorites System",
		description:
			"Mark your best clips as favorites and create custom collections.",
		color: "bg-red-500/10 text-red-500",
	},
	{
		icon: Filter,
		title: "Advanced Filters",
		description:
			"Filter by channel, author, date range, and more for precise results.",
		color: "bg-purple-500/10 text-purple-500",
	},
	{
		icon: Infinity,
		title: "Fluid Browsing",
		description:
			"Infinite scrolling grid with smooth loading for fast exploration.",
		color: "bg-indigo-500/10 text-indigo-500",
	},
];

export function FeatureGrid() {
	return (
		<div className="space-y-16 text-center">
			<div>
				<h2 className="mb-4 text-3xl font-bold md:text-4xl">
					Everything you need
					<br />
					to manage your clips
				</h2>
				<p className="text-muted-foreground mx-auto max-w-2xl text-lg">
					Powerful features to help you organize and find your best
					gaming moments
				</p>
			</div>

			<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
				{features.map((feature, index) => (
					<div
						key={index}
						className="group border-border hover:border-primary/50 rounded-xl border p-6 transition-all duration-200 hover:shadow-lg"
					>
						<div className="space-y-4">
							<div className="grid grid-cols-[48px_1fr] items-center gap-4">
								<div
									className={`flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`}
								>
									<feature.icon className="h-6 w-6" />
								</div>
								<h3 className="group-hover:text-primary text-left text-xl font-semibold transition-colors">
									{feature.title}
								</h3>
							</div>
							<p className="text-muted-foreground leading-relaxed">
								{feature.description}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

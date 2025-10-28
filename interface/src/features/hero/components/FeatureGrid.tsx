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
        <div className="text-center space-y-16">
            <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Everything you need
                    <br />
                    to manage your clips
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Powerful features to help you organize and find your best
                    gaming moments
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => (
                    <div
                        key={index}
                        className="group p-6 rounded-xl border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg"
                    >
                        <div className="space-y-4">
                            <div
                                className={`w-12 h-12 rounded-lg flex items-center justify-center ${feature.color}`}
                            >
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

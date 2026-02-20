"use client";

import { useState } from "react";

interface Tab {
	id: string;
	label: string;
	content: React.ReactNode;
}

interface GuildTabsProps {
	tabs: Tab[];
	defaultTab?: string;
}

export default function GuildTabs({ tabs, defaultTab }: GuildTabsProps) {
	const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id);

	const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

	return (
		<div className="space-y-6">
			{/* Tab Navigation */}
			<div className="border-b border-white/20">
				<nav className="flex gap-4" aria-label="Tabs">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === tab.id
									? "border-blue-500 text-blue-400"
									: "text-muted-foreground border-transparent hover:border-white/20 hover:text-white"
							} `}
							aria-current={
								activeTab === tab.id ? "page" : undefined
							}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content */}
			<div className="mt-6">{activeTabContent}</div>
		</div>
	);
}

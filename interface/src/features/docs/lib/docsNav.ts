export type DocsNavGroup = {
	label: string;
	items: Array<{ title: string; href: string }>;
};

export const docsNav: DocsNavGroup[] = [
	{
		label: "Getting Started",
		items: [
			{ title: "Overview", href: "/docs" },
			{
				title: "Typical lifecycle",
				href: "/docs/getting-started/lifecycle",
			},
			{ title: "Hosted Setup", href: "/docs/getting-started/hosted" },
			{
				title: "Self-hosted Setup",
				href: "/docs/getting-started/self-hosted",
			},
			{
				title: "Local Development",
				href: "/docs/getting-started/local-dev",
			},
		],
	},
	{
		label: "Setup Guides",
		items: [
			{
				title: "Discord application",
				href: "/docs/setup/discord-application",
			},
			{
				title: "Environment & services",
				href: "/docs/setup/environment",
			},
			{ title: "FFmpeg", href: "/docs/setup/ffmpeg" },
			{
				title: "Google Cloud Storage",
				href: "/docs/setup/google-cloud-storage",
			},
		],
	},
	{
		label: "Features & Usage",
		items: [
			{ title: "Using the Dashboard", href: "/docs/features/dashboard" },
			{ title: "Viewing & Managing Clips", href: "/docs/features/clips" },
			{ title: "Tags", href: "/docs/features/tags" },
			{ title: "Privacy & Access", href: "/docs/features/privacy" },
		],
	},
];

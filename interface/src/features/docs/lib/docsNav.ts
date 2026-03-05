export type DocsNavGroup = {
	label: string;
	items: Array<{ title: string; href: string }>;
};

export const docsNav: DocsNavGroup[] = [
	{
		label: "Getting Started",
		items: [
			{ title: "Overview", href: "/docs" },
			{ title: "Hosted Setup", href: "/docs/getting-started/hosted" },
			{ title: "Self-hosted Setup", href: "/docs/getting-started/self-hosted" },
			{ title: "Local Development", href: "/docs/getting-started/local-dev" },
		],
	},
];

import { RootLayout } from "@/components/layout";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: {
		default: "Documentation | Discord Clip Saver",
		template: "%s | Discord Clip Saver Docs",
	},
	description:
		"Learn how to set up, configure, and use Discord Clip Saver for your community.",
	keywords: [
		"discord clip saver docs",
		"discord clip saver setup",
		"how to save discord clips",
		"discord video bot documentation",
	],
	openGraph: {
		title: "Documentation | Discord Clip Saver",
		description:
			"Learn how to set up, configure, and use Discord Clip Saver for your community.",
	},
};

export default function DocsGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <RootLayout>{children}</RootLayout>;
}

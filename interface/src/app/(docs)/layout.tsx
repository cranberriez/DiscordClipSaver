import { RootLayout } from "@/components/layout";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: {
		default: "Documentation | Guild Moments",
		template: "%s | Guild Moments Docs",
	},
	description:
		"Learn how to set up, configure, and use Guild Moments - the ultimate Discord clip saver for your community.",
	keywords: [
		"guild moments docs",
		"discord clip saver setup",
		"how to save discord clips",
		"discord video bot documentation",
	],
	openGraph: {
		title: "Documentation | Guild Moments",
		description:
			"Learn how to set up, configure, and use Guild Moments - the ultimate Discord clip saver for your community.",
	},
};

export default function DocsGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <RootLayout>{children}</RootLayout>;
}

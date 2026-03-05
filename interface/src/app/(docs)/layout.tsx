import { RootLayout } from "@/components/layout";

export default function DocsGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <RootLayout>{children}</RootLayout>;
}

import { Navbar } from "@/components/composite/navbar";

export function RootLayout({
	children,
	noLines,
}: {
	children: React.ReactNode;
	noLines?: boolean;
}) {
	return (
		<div className="flex min-h-screen flex-col">
			<Navbar noLines={noLines} />
			<main className="flex flex-1 flex-col">{children}</main>
		</div>
	);
}

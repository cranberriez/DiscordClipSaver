import { Navbar } from "@/components/composite/navbar";

export function RootLayout({
	children,
	hideNavbar,
}: {
	children: React.ReactNode;
	hideNavbar?: boolean;
}) {
	return (
		<div className="bg-background relative flex min-h-screen flex-col overflow-x-hidden">
			{!hideNavbar && <Navbar />}
			<main className="flex flex-1 flex-col">{children}</main>
		</div>
	);
}

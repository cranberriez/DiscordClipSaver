import { Navbar } from "@/components/composite/navbar";

export function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col">
			<Navbar />
			<main className="flex flex-1 flex-col">{children}</main>
		</div>
	);
}

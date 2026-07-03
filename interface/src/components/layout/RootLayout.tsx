import { Navbar } from "@/components/composite/navbar";
import { AnnouncementBar } from "@/components/core/AnnouncementBar";
import { areDiscordInvitesDisabled } from "@/server/discord/invites";

export function RootLayout({
	children,
	hideNavbar,
}: {
	children: React.ReactNode;
	hideNavbar?: boolean;
}) {
	return (
		<div className="bg-background relative flex min-h-screen flex-col overflow-x-hidden">
			{areDiscordInvitesDisabled() && <AnnouncementBar />}
			{!hideNavbar && <Navbar />}
			<main className="flex flex-1 flex-col">{children}</main>
		</div>
	);
}

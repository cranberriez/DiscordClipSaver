import { redirect } from "next/navigation";

type PageProps = {
	params: Promise<{ guildId: string }>;
};

export default async function GuildPage({ params }: PageProps) {
	const { guildId } = await params;

	// Redirect to channels tab by default
	redirect(`/dashboard/${guildId}/channels`);
}

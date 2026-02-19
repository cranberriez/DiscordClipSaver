import { TagManagement } from "@/features/dashboard/admin";

type PageProps = {
	params: Promise<{ guildId: string }>;
};

export default async function TagsPage({ params }: PageProps) {
	const { guildId } = await params;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Tags</h2>
				<p className="text-muted-foreground">
					Manage tags for this server. Tags can be used to organize
					and filter clips.
				</p>
			</div>

			<TagManagement guildId={guildId} />
		</div>
	);
}

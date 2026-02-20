import DynamicSettingsForm from "@/features/dashboard/admin/settings/components/DynamicSettingsForm";
import { DangerZone } from "@/features/dashboard/admin/settings/components/DangerZone";
import { DataService } from "@/server/services/data-service";
import { redirect } from "next/navigation";

type PageProps = {
	params: Promise<{ guildId: string }>;
};

export default async function SettingsPage({ params }: PageProps) {
	const { guildId } = await params;

	// Fetch guild data for danger zone
	const guild = await DataService.getSingleGuildById(guildId);

	if (!guild) {
		redirect("/dashboard");
	}

	return (
		<div className="space-y-8">
			<DynamicSettingsForm guildId={guildId} />

			{/* Only show danger zone if guild is not already deleted */}
			{!guild.deleted_at && (
				<DangerZone guildId={guildId} guildName={guild.name} />
			)}
		</div>
	);
}

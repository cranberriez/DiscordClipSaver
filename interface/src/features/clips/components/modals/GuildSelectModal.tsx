"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { GuildWithStats } from "@/lib/api/guild";
import { GuildSelectContent } from "../clip-filtering";

interface GuildSelectModalProps {
	guilds: GuildWithStats[];
	isLoading?: boolean;
}

export function GuildSelectModal({
	guilds,
	isLoading = false,
}: GuildSelectModalProps) {
	const { isGuildModalOpen, closeGuildModal } = useClipFiltersStore();

	return (
		<Dialog open={isGuildModalOpen} onOpenChange={closeGuildModal}>
			<DialogContent className="flex max-h-[80vh] max-w-2xl flex-col p-0">
				<div className="p-6 pb-2">
					<DialogHeader>
						<DialogTitle>Select a Server</DialogTitle>
					</DialogHeader>
				</div>

				<GuildSelectContent
					guilds={guilds}
					isLoading={isLoading}
					onSelect={closeGuildModal}
				/>

				{/* Footer */}
				<div className="flex justify-end p-6 pt-2">
					<Button onClick={closeGuildModal}>Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { ChannelWithStats } from "@/lib/api/channel";
import { ChannelSelectContent } from "../clip-filtering";

interface ChannelSelectModalProps {
	channels: ChannelWithStats[];
	isLoading?: boolean;
}

export function ChannelSelectModal({
	channels,
	isLoading = false,
}: ChannelSelectModalProps) {
	const { isChannelModalOpen, closeChannelModal } = useClipFiltersStore();

	return (
		<Dialog open={isChannelModalOpen} onOpenChange={closeChannelModal}>
			<DialogContent className="flex max-h-[80vh] flex-col p-0 sm:!max-w-6xl">
				<div className="p-6 pb-2">
					<DialogHeader>
						<DialogTitle>Select Channels</DialogTitle>
					</DialogHeader>
				</div>

				<ChannelSelectContent
					channels={channels}
					isLoading={isLoading}
				/>

				{/* Footer */}
				<div className="flex justify-end p-6 pt-2">
					<Button onClick={closeChannelModal}>Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { AuthorWithStats } from "@/lib/api/author";
import { AuthorSelectContent } from "../clip-filtering";

interface AuthorSelectModalProps {
	authors: AuthorWithStats[];
	isLoading?: boolean;
}

export function AuthorSelectModal({
	authors,
	isLoading = false,
}: AuthorSelectModalProps) {
	const { isAuthorModalOpen, closeAuthorModal } = useClipFiltersStore();

	return (
		<Dialog open={isAuthorModalOpen} onOpenChange={closeAuthorModal}>
			<DialogContent className="flex max-h-[80vh] flex-col p-0 sm:!max-w-6xl">
				<div className="p-6 pb-2">
					<DialogHeader>
						<DialogTitle>Select Authors</DialogTitle>
					</DialogHeader>
				</div>

				<AuthorSelectContent authors={authors} isLoading={isLoading} />

				{/* Footer */}
				<div className="flex justify-end p-6 pt-2">
					<Button onClick={closeAuthorModal}>Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

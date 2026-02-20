import { Suspense } from "react";
import { ClipsPageContent } from "@/features/clips/components/ClipsPageContent";
import { ClipsPageLoader } from "@/features/clips/components/ClipsPageLoader";

/**
 * Centralized Clips Viewer
 *
 * Features:
 * - Persistent filter state with Zustand
 * - Guild/Channel/Author selection modals
 * - Sticky filter bar
 * - Server-side filtering for channels
 * - Client-side search
 * - Infinite scroll pagination
 * - Sort by date (asc/desc)
 *
 * This page component handles the Suspense boundary for useSearchParams()
 * and delegates the main functionality to ClipsPageContent.
 */
export default function ClipsPage() {
	return (
		<Suspense fallback={<ClipsPageLoader />}>
			<ClipsPageContent />
		</Suspense>
	);
}

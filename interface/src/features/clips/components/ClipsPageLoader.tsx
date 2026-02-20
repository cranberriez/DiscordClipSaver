import { Navbar } from "@/components/composite/navbar";

/**
 * Loading fallback component for the clips page while Suspense boundary resolves.
 * Shows a minimal layout with navbar and loading state.
 */
export function ClipsPageLoader() {
	return (
		<div className="bg-background flex h-screen flex-col">
			<Navbar noLines />
			<div className="flex flex-1 items-center justify-center">
				<div className="text-muted-foreground py-24 text-center">
					<div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
					<p>Loading clips viewer...</p>
				</div>
			</div>
		</div>
	);
}

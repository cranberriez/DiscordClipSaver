import { Navbar } from "@/components/composite/navbar";

/**
 * Loading fallback component for the clips page while Suspense boundary resolves.
 * Shows a minimal layout with navbar and loading state.
 */
export function ClipsPageLoader() {
    return (
        <div className="flex flex-col h-screen bg-background">
            <Navbar noLines />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-24 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading clips viewer...</p>
                </div>
            </div>
        </div>
    );
}

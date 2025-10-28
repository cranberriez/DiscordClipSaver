import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
    isAuthenticated: boolean;
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
    return (
        <div className="text-center space-y-2">
            <div className="space-y-2">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                    Your Discord
                    <br />
                    <span className="text-primary">Clips, Organized</span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                    Automatically capture, organize, and search through all your
                    Discord server clips.
                    <br />
                    <span className="text-lg md:text-xl">
                        Never lose an epic moment again.
                    </span>
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <Button
                    size="lg"
                    className="text-base px-8 py-6 min-w-48"
                    asChild
                >
                    <Link href={isAuthenticated ? "/clips" : "/login"}>
                        {isAuthenticated ? "View My Clips" : "Get Started Free"}
                    </Link>
                </Button>

                <Button
                    variant="outline"
                    size="lg"
                    className="text-base px-8 py-6 min-w-48"
                    asChild
                >
                    <Link href="/docs">View Documentation</Link>
                </Button>
            </div>

            <p className="text-sm text-muted-foreground pt-4">
                Free to use • Open source • Self-hostable
            </p>
        </div>
    );
}

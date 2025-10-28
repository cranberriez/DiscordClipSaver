import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export function OpenSourceBanner() {
    return (
        <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
                Open source & self-hostable
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Complete control over your data. Host it yourself or contribute
                to make it better for everyone.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button variant="outline" asChild>
                    <Link
                        href="https://github.com/cranberriez/DiscordClipSaver"
                        className="flex items-center gap-2"
                    >
                        <Github className="w-4 h-4" />
                        View on GitHub
                    </Link>
                </Button>

                <Button variant="outline" asChild>
                    <Link href="/docs/self-hosting">Self-Hosting Guide</Link>
                </Button>
            </div>
        </div>
    );
}

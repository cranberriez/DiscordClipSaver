import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";

interface HeroSectionProps {
    isAuthenticated: boolean;
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col items-center">
                <h1 className="text-5xl md:text-8xl lg:text-[8rem] font-bold tracking-tight space-y-4 text-left">
                    Your Clips.
                    <br />
                    Your Moments.
                    <br />
                    <span className="font-semibold bg-gradient-to-br from-sky-600 to-emerald-500 bg-clip-text text-transparent tracking-wide italic">
                        All in One Place.
                    </span>
                </h1>
            </div>

            <h2 className="text-lg md:text-xl lg:text-2xl text-primary mx-auto leading-relaxed tracking-wide">
                Automatically capture, organize, and search through all your
                Discord server clips.
            </h2>

            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-16">
                <Button
                    size="lg"
                    className="text-lg px-8 py-6 min-w-48 bg-sky-400/1 hover:bg-sky-400/5 text-sky-400 border border-sky-400/50 text-shadow-lg font-bold -tracking-tight group/btn shadow-[0_0_28px_oklch(74.6%_0.16_232.661_/_0.45)] hover:shadow-[0_0_42px_oklch(74.6%_0.16_232.661_/_0.6)] transition-shadow"
                    asChild
                >
                    {isAuthenticated ? (
                        <Link href="/clips">View Clips</Link>
                    ) : (
                        <Link href="/login">
                            Get Started Free
                            <ArrowRightIcon className="h-5 w-5 group-hover/btn:translate-x-2 transition-all" />
                        </Link>
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6 min-w-32 text-muted-foreground"
                    asChild
                >
                    <Link href="/docs">View Docs</Link>
                </Button>
            </div>

            <div className="text-sm text-muted-foreground mx-auto flex items-center py-2 px-4 border rounded-full bg-secondary/20">
                <SparklesIcon className="inline mr-2 h-4 w-4" />
                Free to use • Open source • Self-hostable
            </div>

            {/* Stats */}
            <div className="mx-auto flex gap-12">
                <div>
                    <h3 className="text-4xl font-bold text-center">5+</h3>
                    <p className="text-muted-foreground text-center">Servers</p>
                </div>

                <div>
                    <h3 className="text-4xl font-bold text-center">100+</h3>
                    <p className="text-muted-foreground text-center">
                        Channels
                    </p>
                </div>

                <div>
                    <h3 className="text-4xl font-bold text-center">2k+</h3>
                    <p className="text-muted-foreground text-center">Clips</p>
                </div>
            </div>
        </div>
    );
}

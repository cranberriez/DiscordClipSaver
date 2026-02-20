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
				<h1 className="space-y-4 text-left text-5xl font-bold tracking-tight md:text-8xl lg:text-[8rem]">
					Your Clips.
					<br />
					Your Moments.
					<br />
					<span className="bg-gradient-to-br from-sky-600 to-emerald-500 bg-clip-text font-semibold tracking-wide text-transparent italic">
						All in One Place.
					</span>
				</h1>
			</div>

			<h2 className="text-primary mx-auto text-lg leading-relaxed tracking-wide md:text-xl lg:text-2xl">
				Automatically capture, organize, and search through all your
				Discord server clips.
			</h2>

			<div className="mt-16 flex flex-col items-center justify-center gap-8 sm:flex-row">
				<Button
					size="lg"
					className="group/btn min-w-48 border border-sky-400/50 bg-gradient-to-br from-sky-600 to-emerald-500 px-8 py-6 text-lg font-bold -tracking-tight text-white shadow-[0_0_28px_oklch(74.6%_0.16_232.661_/_0.45)] transition-shadow text-shadow-lg hover:bg-gradient-to-br hover:shadow-[0_0_42px_oklch(74.6%_0.16_232.661_/_0.6)]"
					asChild
				>
					{isAuthenticated ? (
						<Link href="/clips">View Clips</Link>
					) : (
						<Link href="/login">
							Get Started Free
							<ArrowRightIcon className="h-5 w-5 transition-all group-hover/btn:translate-x-2" />
						</Link>
					)}
				</Button>

				<Button
					variant="outline"
					size="lg"
					className="text-muted-foreground min-w-32 px-8 py-6 text-lg"
					asChild
				>
					<Link href="/docs">View Docs</Link>
				</Button>
			</div>

			<div className="text-muted-foreground bg-secondary/20 mx-auto flex items-center rounded-full border px-4 py-2 text-sm">
				<SparklesIcon className="mr-2 inline h-4 w-4" />
				Free to use • Open source • Self-hostable
			</div>

			{/* Stats */}
			<div className="mx-auto flex gap-12">
				<div>
					<h3 className="text-center text-4xl font-bold">5+</h3>
					<p className="text-muted-foreground text-center">Servers</p>
				</div>

				<div>
					<h3 className="text-center text-4xl font-bold">100+</h3>
					<p className="text-muted-foreground text-center">
						Channels
					</p>
				</div>

				<div>
					<h3 className="text-center text-4xl font-bold">2k+</h3>
					<p className="text-muted-foreground text-center">Clips</p>
				</div>
			</div>
		</div>
	);
}

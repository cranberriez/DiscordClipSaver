import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { SectionLayout } from "./SectionLayout";

export function OpenSourceBanner() {
	return (
		<SectionLayout>
			<div className="mx-auto w-full max-w-5xl space-y-12 text-center">
				<div className="space-y-4">
					<div className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">
						Hosting
					</div>
					<h2 className="text-3xl font-bold tracking-tight md:text-4xl">
						Open source & self-hostable
					</h2>
					<p className="text-muted-foreground mx-auto max-w-2xl text-[17px]">
						Complete control over your data. Host it yourself or
						contribute to make it better for everyone.
					</p>
				</div>

				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button variant="outline" asChild>
						<Link
							href="https://github.com/cranberriez/DiscordClipSaver"
							className="flex items-center gap-2"
						>
							<Github className="h-4 w-4" />
							View on GitHub
						</Link>
					</Button>

					<Button variant="outline" asChild>
						<Link href="/docs/self-hosting">
							Self-Hosting Guide
						</Link>
					</Button>
				</div>
			</div>
		</SectionLayout>
	);
}

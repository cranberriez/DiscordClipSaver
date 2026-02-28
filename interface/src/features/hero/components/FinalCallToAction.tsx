import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionLayout } from "./SectionLayout";
import { Sparkles, ArrowRight } from "lucide-react";

interface CallToActionProps {
	isAuthenticated: boolean;
}

export function FinalCallToAction({ isAuthenticated }: CallToActionProps) {
	return (
		<SectionLayout>
			<div className="relative mx-auto w-full overflow-hidden rounded-[2rem] border border-indigo-500/20 bg-[#0c0c10] px-6 py-16 text-center shadow-2xl sm:px-12 sm:py-24 md:p-24">
				{/* Background Glow Accents */}
				<div className="pointer-events-none absolute -top-40 -left-40 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
				<div className="pointer-events-none absolute -right-40 -bottom-40 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />

				<div className="relative z-10 flex flex-col items-center space-y-8">
					<div className="space-y-4">
						<h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
							Ready to get started?
						</h2>

						<p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
							{isAuthenticated
								? "Start browsing your clips or set up scanning for your servers."
								: "Join today and start organizing your community's best moments in minutes. No credit card required."}
						</p>
					</div>

					<div className="pt-4">
						<Button
							size="lg"
							className="bg-primary hover:bg-primary-hover rounded-full px-8 font-semibold text-white transition-all hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
							asChild
						>
							<Link
								href={isAuthenticated ? "/clips" : "/login"}
								className="flex items-center gap-2"
							>
								{isAuthenticated
									? "Browse My Clips"
									: "Get Started Free"}
								<ArrowRight className="h-5 w-5" />
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</SectionLayout>
	);
}

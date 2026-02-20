import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CallToActionProps {
	isAuthenticated: boolean;
}

export function CallToAction({ isAuthenticated }: CallToActionProps) {
	return (
		<div className="space-y-6 text-center">
			<h2 className="text-3xl font-bold md:text-4xl">
				Ready to get started?
			</h2>

			<p className="text-muted-foreground text-lg">
				{isAuthenticated
					? "Start browsing your clips or set up scanning for your servers."
					: "Start using Discord Clip Saver right now with our free plan."}
			</p>

			<div className="pt-4">
				<Button size="lg" asChild>
					<Link href={isAuthenticated ? "/clips" : "/login"}>
						{isAuthenticated
							? "Browse My Clips"
							: "Get Started Free"}
					</Link>
				</Button>
			</div>
		</div>
	);
}

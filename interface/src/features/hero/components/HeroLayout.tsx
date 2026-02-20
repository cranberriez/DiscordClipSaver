import { ReactNode } from "react";
import { BackgroundBeams } from "@/components/ui/shadcn-io/background-beams";

interface HeroLayoutProps {
	children: ReactNode;
}

export function HeroLayout({ children }: HeroLayoutProps) {
	return (
		<section
			className="flex items-center justify-center"
			style={{ height: "calc(100vh - var(--navbar-height))" }}
		>
			<BackgroundBeams className="absolute inset-0" />
			<div className="z-10 flex h-full w-full items-center justify-center bg-transparent px-6 backdrop-blur-[2px]">
				{children}
			</div>
		</section>
	);
}

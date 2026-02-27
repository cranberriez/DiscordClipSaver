import { ReactNode } from "react";

interface SectionLayoutProps {
	children: ReactNode;
}

export function SectionLayout({ children }: SectionLayoutProps) {
	return (
		<section className="flex items-center justify-center px-6 py-20 md:py-28">
			<div className="container mx-auto max-w-5xl">{children}</div>
		</section>
	);
}

import { PageContainer } from "@/components/layout";
import { DocsSidebar } from "@/features/docs/components/DocsSidebar";
import { DocsMobileNav } from "@/features/docs/components/DocsMobileNav";

export default function DocsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PageContainer maxWidth="7xl" className="pt-6">
			<div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[260px_1fr]">
				<aside className="border-border/40 sticky top-4 hidden max-h-[calc(100dvh-2rem)] self-start overflow-y-auto overscroll-contain border-r pr-6 lg:block">
					<DocsSidebar />
				</aside>

				<div className="min-w-0">
					<DocsMobileNav />
					{children}
				</div>
			</div>
		</PageContainer>
	);
}

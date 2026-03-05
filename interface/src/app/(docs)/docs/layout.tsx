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
			<div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
				<aside className="border-border/40 sticky top-[calc(var(--navbar-height)+12px)] hidden h-[calc(100vh-var(--navbar-height)-24px)] overflow-y-auto border-r pr-6 lg:block">
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

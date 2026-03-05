import { notFound } from "next/navigation";
import { DocsMarkdown } from "@/features/docs/components/DocsMarkdown";
import { DocsToc } from "@/features/docs/components/DocsToc";
import { getDocsPageContent } from "@/features/docs/lib/docsContent";

export default async function DocsPage({
	params,
}: {
	params: Promise<{ slug?: string[] }>;
}) {
	const { slug } = await params;

	try {
		const content = await getDocsPageContent(slug ?? []);

		return (
			<div className="grid grid-cols-1 gap-10 xl:grid-cols-[1fr_220px]">
				<article className="min-w-0">
					<div className="flex min-w-0 flex-col gap-6">
						<DocsMarkdown markdown={content.markdown} />
					</div>
				</article>

				<aside className="border-border/40 sticky top-[calc(var(--navbar-height)+12px)] hidden h-[calc(100vh-var(--navbar-height)-24px)] overflow-y-auto border-l pl-6 xl:block">
					<DocsToc headings={content.headings} />
				</aside>
			</div>
		);
	} catch {
		notFound();
	}
}

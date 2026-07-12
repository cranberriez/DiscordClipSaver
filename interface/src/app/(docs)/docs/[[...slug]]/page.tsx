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
			<div className="grid grid-cols-1 items-start gap-10 xl:grid-cols-[1fr_220px]">
				<article className="min-w-0">
					<DocsMarkdown markdown={content.markdown} />
				</article>

				<aside className="border-border/40 sticky top-4 hidden max-h-[calc(100dvh-2rem)] self-start overflow-hidden border-l pl-6 xl:block">
					<DocsToc headings={content.headings} />
				</aside>
			</div>
		);
	} catch {
		notFound();
	}
}

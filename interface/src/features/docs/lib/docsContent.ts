import fs from "fs/promises";
import path from "path";
import GithubSlugger from "github-slugger";

const DOCS_CONTENT_DIR = path.join(
	process.cwd(),
	"src",
	"features",
	"docs",
	"content"
);

export type DocsHeading = {
	depth: number;
	text: string;
	id: string;
};

export type DocsPageContent = {
	markdown: string;
	headings: DocsHeading[];
};

function extractHeadings(markdown: string): DocsHeading[] {
	const slugger = new GithubSlugger();
	const headings: DocsHeading[] = [];

	for (const line of markdown.split("\n")) {
		const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
		if (!match) continue;

		const depth = match[1].length;
		const text = match[2].replace(/`/g, "").trim();
		const id = slugger.slug(text);

		headings.push({ depth, text, id });
	}

	return headings;
}

function resolveDocPath(slugSegments: string[]): string {
	const rel = slugSegments.length === 0 ? ["index"] : slugSegments;
	return path.join(DOCS_CONTENT_DIR, ...rel) + ".md";
}

export async function getDocsPageContent(
	slugSegments: string[]
): Promise<DocsPageContent> {
	const docPath = resolveDocPath(slugSegments);
	const markdown = await fs.readFile(docPath, "utf8");
	const headings = extractHeadings(markdown);
	return { markdown, headings };
}

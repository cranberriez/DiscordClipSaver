import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

export function DocsMarkdown({ markdown }: { markdown: string }) {
	type CodeProps = React.ComponentPropsWithoutRef<"code"> & {
		inline?: boolean;
		node?: unknown;
	};

	const components: Components = {
		h1: (props: React.ComponentPropsWithoutRef<"h1">) => (
			<h1
				className="scroll-m-24 text-3xl leading-tight font-bold tracking-tight sm:text-4xl"
				{...props}
			>
				{props.children}
			</h1>
		),
		h2: (props: React.ComponentPropsWithoutRef<"h2">) => (
			<h2
				className="border-border mt-10 scroll-m-24 border-b pb-2.5 text-2xl leading-tight font-semibold tracking-tight"
				{...props}
			>
				{props.children}
			</h2>
		),
		h3: (props: React.ComponentPropsWithoutRef<"h3">) => (
			<h3
				className="mt-7 scroll-m-24 text-xl leading-snug font-semibold tracking-tight"
				{...props}
			>
				{props.children}
			</h3>
		),
		p: (props: React.ComponentPropsWithoutRef<"p">) => (
			<p className="text-foreground/90 mt-3.5 leading-7" {...props}>
				{props.children}
			</p>
		),
		a: (props: React.ComponentPropsWithoutRef<"a">) => (
			<a
				className="text-primary decoration-primary/50 hover:decoration-primary font-medium underline underline-offset-4 transition-colors"
				{...props}
			>
				{props.children}
			</a>
		),
		ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
			<ul
				className="text-foreground/90 marker:text-muted-foreground my-4 ml-5 list-disc space-y-2 leading-7"
				{...props}
			>
				{props.children}
			</ul>
		),
		ol: (props: React.ComponentPropsWithoutRef<"ol">) => (
			<ol
				className="text-foreground/90 marker:text-muted-foreground my-4 ml-5 list-decimal space-y-2 leading-7 marker:font-medium"
				{...props}
			>
				{props.children}
			</ol>
		),
		blockquote: (props: React.ComponentPropsWithoutRef<"blockquote">) => (
			<blockquote
				className="border-primary/50 bg-muted/30 text-muted-foreground my-5 rounded-r-md border-l-2 py-2 pr-4 pl-4"
				{...props}
			>
				{props.children}
			</blockquote>
		),
		code: (props: CodeProps) => {
			const { className, ...rest } = props;
			const isBlock =
				className?.includes("language-") ||
				String(props.children).endsWith("\n");
			if (isBlock) {
				return (
					<code className={className} {...rest}>
						{props.children}
					</code>
				);
			}
			return (
				<code
					className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.875em]"
					{...rest}
				>
					{props.children}
				</code>
			);
		},
		pre: (props: React.ComponentPropsWithoutRef<"pre">) => (
			<pre
				className="bg-card border-border my-5 overflow-x-auto rounded-lg border p-4 text-sm leading-6 shadow-sm [&>code]:bg-transparent [&>code]:p-0"
				{...props}
			>
				{props.children}
			</pre>
		),
		hr: (props: React.ComponentPropsWithoutRef<"hr">) => (
			<hr className="border-border my-9" {...props} />
		),
		table: (props: React.ComponentPropsWithoutRef<"table">) => (
			<div className="border-border my-5 overflow-x-auto rounded-lg border">
				<table
					className="w-full min-w-[560px] border-collapse text-left text-sm"
					{...props}
				>
					{props.children}
				</table>
			</div>
		),
		thead: (props: React.ComponentPropsWithoutRef<"thead">) => (
			<thead className="bg-muted/60" {...props}>
				{props.children}
			</thead>
		),
		tbody: (props: React.ComponentPropsWithoutRef<"tbody">) => (
			<tbody
				className="divide-border divide-y [&>tr:last-child]:border-0"
				{...props}
			>
				{props.children}
			</tbody>
		),
		tr: (props: React.ComponentPropsWithoutRef<"tr">) => (
			<tr className="hover:bg-muted/25 transition-colors" {...props}>
				{props.children}
			</tr>
		),
		th: (props: React.ComponentPropsWithoutRef<"th">) => (
			<th
				className="text-foreground px-4 py-3 font-semibold whitespace-nowrap"
				{...props}
			>
				{props.children}
			</th>
		),
		td: (props: React.ComponentPropsWithoutRef<"td">) => (
			<td
				className="text-foreground/85 px-4 py-3 align-top leading-6"
				{...props}
			>
				{props.children}
			</td>
		),
	};

	return (
		<div className="min-w-0 pb-12 [&>h1+*]:mt-4 [&>h2+*]:mt-4 [&>h3+*]:mt-3">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[
					rehypeSlug,
					[
						rehypeAutolinkHeadings,
						{
							behavior: "wrap",
							properties: {
								className: [
									"no-underline",
									"hover:underline",
									"underline-offset-4",
								],
							},
						},
					],
				]}
				components={components}
			>
				{markdown}
			</ReactMarkdown>
		</div>
	);
}

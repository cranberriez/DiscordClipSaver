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
				className="scroll-m-20 text-4xl font-bold tracking-tight"
				{...props}
			>
				{props.children}
			</h1>
		),
		h2: (props: React.ComponentPropsWithoutRef<"h2">) => (
			<h2
				className="border-border scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight"
				{...props}
			>
				{props.children}
			</h2>
		),
		h3: (props: React.ComponentPropsWithoutRef<"h3">) => (
			<h3
				className="scroll-m-20 text-xl font-semibold tracking-tight"
				{...props}
			>
				{props.children}
			</h3>
		),
		p: (props: React.ComponentPropsWithoutRef<"p">) => (
			<p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
				{props.children}
			</p>
		),
		a: (props: React.ComponentPropsWithoutRef<"a">) => (
			<a className="text-primary underline underline-offset-4" {...props}>
				{props.children}
			</a>
		),
		ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
			<ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
				{props.children}
			</ul>
		),
		ol: (props: React.ComponentPropsWithoutRef<"ol">) => (
			<ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props}>
				{props.children}
			</ol>
		),
		blockquote: (props: React.ComponentPropsWithoutRef<"blockquote">) => (
			<blockquote
				className="border-border mt-6 border-l-2 pl-6 italic"
				{...props}
			>
				{props.children}
			</blockquote>
		),
		code: (props: CodeProps) => {
			const { className, ...rest } = props;
			const isBlock = className?.includes("language-");
			if (isBlock) {
				return (
					<code className={className} {...rest}>
						{props.children}
					</code>
				);
			}
			return (
				<code
					className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm"
					{...rest}
				>
					{props.children}
				</code>
			);
		},
		pre: (props: React.ComponentPropsWithoutRef<"pre">) => (
			<pre
				className="bg-muted my-6 overflow-x-auto rounded-lg p-4"
				{...props}
			>
				{props.children}
			</pre>
		),
		hr: (props: React.ComponentPropsWithoutRef<"hr">) => (
			<hr className="border-border my-10" {...props} />
		),
	};

	return (
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
	);
}

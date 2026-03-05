import Link from "next/link";
import { PageContainer } from "@/components/layout";

export default function DocsNotFound() {
	return (
		<PageContainer className="pt-10">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold">Doc not found</h1>
				<p className="text-muted-foreground text-sm">
					That docs page doesn&apos;t exist.
				</p>
				<Link href="/docs" className="text-primary underline underline-offset-4">
					Back to docs
				</Link>
			</div>
		</PageContainer>
	);
}

import { PageContainer, RootLayout } from "@/components/layout";
import { InvitePageClient } from "./InvitePageClient";

export const dynamic = "force-dynamic";

export default function InvitePage() {
	return (
		<RootLayout>
			<PageContainer className="flex-1">
				<InvitePageClient />
			</PageContainer>
		</RootLayout>
	);
}

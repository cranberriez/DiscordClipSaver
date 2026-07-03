import { PageContainer, RootLayout } from "@/components/layout";
import { InstallPageClient } from "./InstallPageClient";

export const dynamic = "force-dynamic";

export default function InstallPage() {
	return (
		<RootLayout>
			<PageContainer className="flex-1">
				<InstallPageClient />
			</PageContainer>
		</RootLayout>
	);
}

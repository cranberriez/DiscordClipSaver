import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { RootLayout } from "@/components/layout";
import { Toaster } from "sonner";
import { PageContainer } from "@/components/layout";

export default async function SetupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Protect all setup routes - require authentication
	const session = await getServerSession(authOptions);

	if (!session) {
		redirect("/login");
	}

	return (
		<RootLayout>
			<PageContainer>{children}</PageContainer>
			<Toaster duration={5000} theme="dark" richColors closeButton />
		</RootLayout>
	);
}

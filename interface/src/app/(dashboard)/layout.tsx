import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { RootLayout } from "@/components/layout";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Protect all dashboard routes - require authentication
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return <RootLayout>{children}</RootLayout>;
}

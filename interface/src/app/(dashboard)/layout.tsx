import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { Navbar } from "@/components/composite/navbar";

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

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
        </div>
    );
}
